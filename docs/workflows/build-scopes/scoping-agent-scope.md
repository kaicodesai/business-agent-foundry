# Workflow Build Scope — [PA] Scoping Agent
Version: 1.0
Last updated: 2026-05-08
For: workflow-builder-agent
Source of truth: live n8n workflow `E24KwVMam1e8bbjT` (`[PA] Scoping Agent`) as of 2026-05-08

---

## Overview

The Scoping Agent takes assessment-call notes and produces a structured scope: a one-paragraph summary, a fuller implementation-oriented scope of work, a service tier, an automation count, up to three named automations with descriptions, and a tools-required list. The output is written back to the Airtable Prospects record. The next step (proposal generation) is handled by `[PA] Scope Approval`.

It uses an LLM via OpenRouter with a primary model and a wired fallback. Both prompts ask for compact JSON only; a Code node parses, validates, and remaps tier vocabulary defensively.

---

## Triggers

| Trigger | Type | Path / cadence | Use |
|---------|------|----------------|-----|
| `Scope Call Webhook` | Webhook POST | `/scope-call` | External programmatic trigger (legacy) |
| `Poll Every 2 Hours` | Schedule | every 2h | Recovery sweep — picks up new `call_complete` prospects AND stale `scoping` prospects |
| `Scope Call Form` | Form Trigger | `/form/scope-call-form` | Owner-facing form for fast post-call data entry — used by Scoping Notifier's "Start Scoping Now" CTA |
| `When Executed by Scoping Notifier` | Execute Workflow Trigger | sub-workflow call | Called by `[PA] Scoping Notifier`'s `Call Scoping Agent Sub-workflow` node |

All four triggers feed the same `Prepare Client Data` Code node, except the cron which loops via `Split Records → Loop Over Clients → Prepare Client Data`.

---

## Data flow

```
Scope Call Webhook        ─┐
Scope Call Form           ─┤
When Executed by Notifier ─┼─▶ Prepare Client Data
                           │
Poll Every 2 Hours ─▶ Fetch call_complete Clients
                          └─▶ IF Pending Clients
                                ├─ true  ─▶ Split Records ─▶ Loop Over Clients ─▶ Prepare Client Data
                                └─ false ─▶ Exit No Pending

Prepare Client Data
  └─▶ Fetch Full Client Record (Airtable, by client_slug OR record_id)
        └─▶ Set Status to Scoping (PATCH project_status='scoping', outreach_status='converted')
              └─▶ Scoping agent (OpenRouter — qwen/qwen3.6-max-preview)
                    └─▶ IF Scoping Primary OK
                          ├─ ok  ─▶ Parse Scope JSON
                          └─ err ─▶ Scoping agent fallback (deepseek/deepseek-v4-pro) ─▶ Parse Scope JSON

                  Parse Scope JSON
                    └─▶ Write Scope to Airtable (PATCH ?typecast=true)
                          └─▶ Email Kai for Approval (with Approve + Reject buttons)
                                └─▶ Log to Automation Logs
                                      └─▶ Loop Over Clients (next batch)
```

---

## Stale-record recovery

The polling filter combines two cases — fresh prospects and stuck-mid-scope prospects:

```
AND(
  {call_notes}!="",
  OR(
    {project_status}="call_complete",
    AND(
      {project_status}="scoping",
      {scope_summary}="",
      IS_BEFORE(LAST_MODIFIED_TIME({project_status}), DATEADD(NOW(),-1,"hours"))
    )
  )
)
```

A prospect that gets stuck in `scoping` (workflow halted between `Set Status to Scoping` and the LLM response) is automatically retried on the next 2h cron, provided no other status change has happened to its `project_status` field within the last hour.

---

## Node-by-node spec

### 1. `Prepare Client Data` — Code

Detects the trigger source and normalises the payload. Handles four shapes:
- Form input (`$json['Client slug']`, `$json['Company name']`, etc.)
- Webhook body (`body.record_id`, `body.company_name`, ...)
- Sub-workflow passthrough (uses upstream item's record_id/client_slug)
- Cron loop item (already split with record_id + fields)

Emits `{ record_id, company_name, client_slug, industry, call_notes }`. Slugifies `company_name` if no slug provided. Returns empty array if neither record_id nor a derivable slug exists.

### 2. `Fetch Full Client Record` — HTTP Request (Airtable)

- **Method:** GET, retryOnFail 3 × 2000ms
- **filterByFormula:** `OR({client_slug}="<slug>", RECORD_ID()="<rec id>")` — accepts either lookup key
- **pageSize:** 1

### 3. `Set Status to Scoping` — HTTP Request (Airtable PATCH)

- **URL:** `https://api.airtable.com/v0/.../tbluEsKoQ2p49ktVq/{{ ($json.records||[])[0]?.id || $('Prepare Client Data').item.json.record_id }}?typecast=true`
- **retryOnFail:** 3 × 2000ms
- **Body:** `{ fields: { project_status: "scoping", outreach_status: "converted", client_slug: "<from Prepare>" } }`

`?typecast=true` lets Airtable auto-create the `converted` singleSelect option on first write.

### 4. `Scoping agent` — HTTP Request (OpenRouter)

- **URL:** `https://openrouter.ai/api/v1/chat/completions`
- **Credential:** `openRouterApi`
- **continueOnFail:** `true` (so `IF Scoping Primary OK` can branch on error)
- **retryOnFail:** 3 × default
- **timeout:** 300000ms
- **Body:**
```json
{
  "model": "qwen/qwen3.6-max-preview",
  "max_tokens": 1200,
  "reasoning": { "effort": "none", "exclude": true },
  "messages": [{ "role": "user", "content": "<see prompt below>" }]
}
```

**Prompt:**
```
Return ONLY compact valid JSON. No reasoning, no markdown. Keys: scope_summary,
scope_of_work, service_tier, automation_count, automation_1_name,
automation_1_description, automation_2_name, automation_2_description,
automation_3_name, automation_3_description, tools_required.
scope_summary must be one concise paragraph. scope_of_work must be a fuller
implementation-oriented scope in plain text with included automations,
handoff points, assumptions, and success criteria.
Allowed service_tier values: starter-build, growth-package, scale-retainer.
Identify 1 to 3 practical automations from these notes. Keep values concise
but complete.

Client: <company_name>
Industry: <industry>
Notes: <call_notes>
```

### 5. `IF Scoping Primary OK` — IF

Condition: `Boolean(!$json.error && ($json.choices?.[0]?.message?.content || $json.content?.[0]?.text || $json.output))`. True → `Parse Scope JSON`. False → `Scoping agent fallback`.

### 6. `Scoping agent fallback` — HTTP Request (OpenRouter)

Identical shape to primary but uses `model: 'deepseek/deepseek-v4-pro'`. Has `retryOnFail` 3 × default. Output feeds `Parse Scope JSON`.

### 7. `Parse Scope JSON` — Code

- Extracts text from `$json.choices[0].message.content` (with Anthropic and plain fallbacks).
- Greedy-matches the first `{...}` block and `JSON.parse`s it.
- Throws if no JSON, no object, or any of `scope_summary`, `automation_1_name`, `automation_1_description` is missing.
- Defensive tier remap (the `tierMap`) translates accidental aliases (`growth-build → growth-package`, etc.) to the Airtable-accepted values.
- Coerces `automation_count` to Number, joins `tools_required` array if needed.
- Emits a flat object with all 11 fields plus `record_id`, `company_name`, `client_slug` from the upstream prepare step.

### 8. `Write Scope to Airtable` — HTTP Request (Airtable PATCH)

- **URL:** `https://api.airtable.com/v0/.../tbluEsKoQ2p49ktVq/{{ $('Set Status to Scoping').item.json.id }}?typecast=true`
- **retryOnFail:** 3 × 2000ms
- **Body fields:** `client_slug, outreach_status: "converted", project_status: "scope_review", scope_of_work (with summary fallback), scope_summary, service_tier, automation_count, automation_1/2/3_name+description, tools_required`

### 9. `Email Kai for Approval` — Email Send (SMTP)

- **From / To:** kai@phoenixautomation.ai
- **Subject:** `📋 Scope ready for review: {{ $("Parse Scope JSON").item.json.company_name }}`
- **continueOnFail:** `true`
- **retryOnFail:** 3 × 2000ms
- HTML email body shows Company / Slug / Tier / Automations count / Tools required / per-automation name+description / Summary
- Two CTAs:
  - `Approve Scope` → `https://kaiashley.app.n8n.cloud/webhook/approve-scope?client_slug=...`
  - `Reject Scope` → `https://kaiashley.app.n8n.cloud/webhook/reject-scope?client_slug=...`

### 10. `Log to Automation Logs` — HTTP Request (Airtable POST)

Writes one row to `automation_logs` (`tblL7tDAh1KTLtwpt`):
```js
{ workflow: "[PA] Scoping Agent", event: "scope_generated",
  client: <client_slug>, run_at: ISO, timestamp: ISO, status: "completed" }
```
- **continueOnFail:** `true`, retryOnFail 3 × 2000ms.

---

## Error handling summary

| Node | continueOnFail | retryOnFail | Failure path |
|------|----------------|-------------|--------------|
| Fetch call_complete Clients | — | 3 × 2000ms | Halts after retries |
| Fetch Full Client Record | — | 3 × 2000ms | Halts after retries |
| Set Status to Scoping | — | 3 × 2000ms | Halts; stale-recovery filter picks it up next cron |
| Scoping agent | ✅ | 3 × default | IF Scoping Primary OK → fallback model |
| Scoping agent fallback | — | 3 × default | Halts after retries (no third tier) |
| Write Scope to Airtable | — | 3 × 2000ms | Halts after retries |
| Email Kai for Approval | ✅ | 3 × 2000ms | Logged, flow continues |
| Log to Automation Logs | ✅ | 3 × 2000ms | Logged, flow continues |

Global error workflow: `JByknkdAgxRmDKp3`.

---

## Credentials

| Credential name | Type | Used by |
|-----------------|------|---------|
| `Airtable Personal Access Token account` | Airtable Token API | All Airtable HTTP nodes |
| `openRouterApi` | OpenRouter API | Scoping agent + Scoping agent fallback |
| `SMTP account 2` | SMTP | Email Kai for Approval |

---

## Airtable schema dependencies

Prospects table (`tbluEsKoQ2p49ktVq`):
- Read: `project_status`, `call_notes`, `scope_summary`, `client_slug`, `company_name`, `industry`
- Write: `project_status` (→ `scoping`, then `scope_review`), `outreach_status` (→ `converted`), `client_slug`, `scope_of_work`, `scope_summary`, `service_tier`, `automation_count`, `automation_1/2/3_name+description`, `tools_required`

Both PATCHes use `?typecast=true` to allow Airtable to auto-create the `converted` outreach_status option on first write.

`automation_logs` table (`tblL7tDAh1KTLtwpt`):
- Write: `workflow`, `event`, `client`, `run_at`, `timestamp`, `status`

---

## Behavioural caps

- Cron polls every 2 hours.
- Loop processes one prospect per batch (`batchSize: 1` in `Loop Over Clients`).
- Scoping prompt requests max 3 automations; LLM is told "1 to 3 practical automations".
- Both LLM calls have a 5-minute timeout.

---

## Test procedure (pre-activation)

1. Pick a Prospects record with `project_status = "call_complete"` and `call_notes` populated. Set `client_slug` to a known value.
2. Trigger via `Scope Call Form` (`/form/scope-call-form`) with the same slug.
3. Verify:
   - `Fetch Full Client Record` matches the slug
   - `Set Status to Scoping` flips to `scoping` + `outreach_status = converted`
   - `Scoping agent` returns 200 with `choices[0].message.content` populated
   - `Parse Scope JSON` doesn't throw
   - `Write Scope to Airtable` populates all expected fields
   - Owner receives `Email Kai for Approval` with Approve + Reject buttons
   - `Log to Automation Logs` writes one row
4. Stale-recovery test: manually set a record back to `project_status = "scoping"` with `scope_summary = ""`, wait for `LAST_MODIFIED_TIME({project_status})` to be > 1h old (or modify only an unrelated field), trigger the cron. Verify it gets re-picked up.

---

## Known limitations

- LLM models `qwen/qwen3.6-max-preview` (primary) and `deepseek/deepseek-v4-pro` (fallback) are unverified against OpenRouter's catalog. Smoke-test before relying on them.
- The `tierMap` defensive remap covers some LLM hallucinations but not all — if the model invents a tier name not in `prospectTiers` and not in `tierMap`, it defaults to `starter-build`.
- Stale-recovery uses `LAST_MODIFIED_TIME({project_status})`, which is only updated when `project_status` itself changes. If something else updates an unrelated field, the staleness clock keeps ticking — that's intentional.
- The `Scope Call Webhook` (POST `/scope-call`) is the legacy entry point. The active flow is `Scoping Notifier → Execute Workflow Trigger`.
