# Workflow Build Scope — [PA] Scoping Notifier
Version: 1.0
Last updated: 2026-05-08
For: workflow-builder-agent
Source of truth: live n8n workflow `nXXsF4E1BPWIS62r` (`[PA] Scoping Notifier`) as of 2026-05-08

---

## Overview

The Scoping Notifier sits between the assessment call and the Scoping Agent. It has three jobs:

1. **Detect** prospects whose `project_status` has been set to `call_complete` with `call_notes` populated.
2. **Notify** the owner by email so they can decide when to start scoping.
3. **Bridge** the owner's "Start Scoping" click into a sub-workflow call to `[PA] Scoping Agent`, marking the prospect as notified so the cron doesn't re-email.

It supports three entry paths into the same Split → Notify chain, plus a fourth synchronous browser-trigger path that calls the Scoping Agent directly.

---

## Triggers

| Trigger | Type | Cadence / path | Use |
|---------|------|---------------|-----|
| `Fallback Poll Hourly` | Schedule | cron `0 * * * *` | Catches prospects in case the Airtable webhook missed |
| `Manual Trigger` | Manual | Owner click | Ad-hoc re-run of the polling logic |
| `Trigger Scoping Webhook` | Webhook GET | `/trigger-scoping?client_slug=X` | Fired when owner clicks "Start Scoping Now" in the email — kicks off Scoping Agent immediately |
| `Airtable Match Webhook` | Webhook POST | `/scoping-notifier-airtable` | Fired by an Airtable automation when a prospect transitions into `call_complete` — instant notification (no hourly wait) |

---

## Data flow

```
Fallback Poll Hourly / Manual Trigger
        └─▶ Fetch call_complete Prospects (Airtable)
                └─▶ IF Has Prospects
                        ├─ true  ─▶ Split Prospect Records
                        └─ false ─▶ Exit — No Pending

Airtable Match Webhook
        └─▶ Fetch Prospect by Record ID
                └─▶ Split Prospect Records

Split Prospect Records
        └─▶ IF Should Notify
                ├─ true  ─▶ Send Scoping Ready Email
                │             └─▶ Mark Notified (PATCH scoping_notified_at)
                └─ false ─▶ Exit — No Pending

Trigger Scoping Webhook (browser click)
        └─▶ Fetch Prospect by Slug
                └─▶ Extract Prospect
                        └─▶ Call Scoping Agent Sub-workflow (executeWorkflow, no wait)
                                └─▶ Mark Notified — Browser Path (PATCH scoping_notified_at)
                                        └─▶ Respond — Scoping Started (HTML page)
```

---

## Node-by-node spec

### 1. `Fetch call_complete Prospects` — HTTP Request (Airtable)

- **Method:** GET
- **URL:** `https://api.airtable.com/v0/appMLHig3CN7WW0iW/tbluEsKoQ2p49ktVq`
- **Credential:** `Airtable Personal Access Token account`
- **retryOnFail:** 3 × 2000ms
- **filterByFormula:** `AND({project_status}="call_complete",{scoping_notified_at}="",{call_notes}!="")`

### 2. `IF Has Prospects` — IF

Condition: `($json.records || []).length > 0`. False → `Exit — No Pending`.

### 3. `Airtable Match Webhook` + `Fetch Prospect by Record ID`

POST `/scoping-notifier-airtable` body shape:
```json
{ "record_id": "rec..." }   // also accepts recordId, id
```

`Fetch Prospect by Record ID` URL: `https://api.airtable.com/v0/.../tbluEsKoQ2p49ktVq/{{ $json.body?.record_id || $json.body?.recordId || $json.body?.id || $json.record_id || $json.recordId || $json.id }}`. Falls through chained fallbacks to handle different webhook payload shapes.

### 4. `Split Prospect Records` — Code

Handles both shapes — the cron path (`{records: [...]}`) and the webhook path (`{id, fields}`):
```js
const input = $input.first().json || {};
if (Array.isArray(input.records)) return input.records.map(r => ({ json: { record_id: r.id, ...r.fields } }));
if (input.id && input.fields) return [{ json: { record_id: input.id, ...input.fields } }];
if (input.record_id) return [{ json: input }];
return [];
```

### 5. `IF Should Notify` — IF

Re-validates the filter conditions per item (defends against the webhook path, where the upstream filter wasn't applied):
- `project_status === "call_complete"`
- `scoping_notified_at === ""`
- `call_notes !== ""`

All three must be true. Combinator: `and`.

### 6. `Send Scoping Ready Email` — Email Send (SMTP)

- **From:** `Kai Edwards | Phoenix Automation <kai@phoenixautomation.ai>`
- **To:** `kai@phoenixautomation.ai`
- **Subject:** `📋 Ready to scope: {{ $json.company_name }}`
- **retryOnFail:** 3 × 2000ms
- HTML email card showing Company, Contact, Email, Industry, Lead Grade, Slug. If `Precall Brief` field is populated on the prospect, renders a Pre-Call Brief block. If `call_notes` populated, renders the first 500 chars.
- **CTA:** "Start Scoping Now" button → `https://kaiashley.app.n8n.cloud/form/scope-call-form` (the Scoping Agent's form trigger).

### 7. `Mark Notified` — HTTP Request (Airtable PATCH)

- **Method:** PATCH
- **URL:** `https://api.airtable.com/v0/.../tbluEsKoQ2p49ktVq/{{ $("Split Prospect Records").item.json.record_id }}`
- **continueOnFail:** `true` (failure to update timestamp shouldn't block the flow)
- **retryOnFail:** 3 × 2000ms
- **Body:** `{ fields: { scoping_notified_at: new Date().toISOString() } }`

### 8. `Trigger Scoping Webhook` (browser path)

- **Path:** `/trigger-scoping`
- **Method:** GET
- **responseMode:** `responseNode` (uses `Respond — Scoping Started`)
- Used by the email's "Start Scoping Now" link with `?client_slug=X`.

### 9. `Fetch Prospect by Slug` — HTTP Request (Airtable)

- **Method:** GET
- **URL:** `https://api.airtable.com/v0/.../tbluEsKoQ2p49ktVq`
- **retryOnFail:** 3 × 2000ms
- **filterByFormula:** `{client_slug}="{{ $json.query.client_slug }}"`
- **maxRecords:** 1

### 10. `Extract Prospect` — Code

Pulls `record_id`, `company_name`, `client_slug`, `industry`, `call_notes`, `prospect_name` from the first match. Emits an empty-string default for each if missing.

### 11. `Call Scoping Agent Sub-workflow` — Execute Workflow

- **Workflow:** `E24KwVMam1e8bbjT` ([PA] Scoping Agent)
- **Mode:** `once`
- **waitForSubWorkflow:** `false` (browser response stays snappy; Scoping Agent finishes async)
- **workflowInputs:** empty mapping — the upstream item flows to the sub-workflow as the implicit passthrough payload

### 12. `Mark Notified — Browser Path` — HTTP Request (Airtable PATCH)

Mirrors the cron-path Mark Notified. Uses `$("Extract Prospect").item.json.record_id` for the target. continueOnFail: `true`.

### 13. `Respond — Scoping Started` — Respond to Webhook

Returns 200 + `text/html` with a "Scoping Started" confirmation card.

---

## Error handling summary

| Node | continueOnFail | retryOnFail | Failure path |
|------|----------------|-------------|--------------|
| Fetch call_complete Prospects | — | 3 × 2000ms | Halts after 3 retries |
| Fetch Prospect by Slug | — | 3 × 2000ms | Halts after 3 retries |
| Fetch Prospect by Record ID | — | 3 × 2000ms | Halts after 3 retries |
| Send Scoping Ready Email | — | 3 × 2000ms | Halts after 3 retries (no Mark Notified) |
| Mark Notified (cron path) | ✅ | 3 × 2000ms | Logged, flow continues |
| Mark Notified — Browser Path | ✅ | 3 × 2000ms | Logged, flow continues to Respond |
| Call Scoping Agent Sub-workflow | — | — | Halts on sub-workflow fail (rare) |

A global error workflow (`errorWorkflow: JByknkdAgxRmDKp3`) catches unhandled failures.

---

## Credentials

| Credential name | Type | Used by |
|-----------------|------|---------|
| `Airtable Personal Access Token account` | Airtable Token API | All Airtable HTTP nodes |
| `SMTP account 2` | SMTP | Send Scoping Ready Email |

---

## Airtable schema dependencies

Prospects table (`tbluEsKoQ2p49ktVq`) — read/write:
- Read: `project_status`, `scoping_notified_at`, `call_notes`, `client_slug`, `company_name`, `prospect_name`, `email`, `industry`, `lead_score_grade`, `Precall Brief`
- Write: `scoping_notified_at`

Note: `Precall Brief` is the live Airtable column name (mixed case, with space). Other columns follow snake_case.

---

## Behavioural caps

- Cron fires hourly — picks up any `call_complete` prospect not yet notified.
- Cron + Airtable webhook + browser-click triggers all converge to the same Split → IF Should Notify chain so the dedup gate (`scoping_notified_at = ""`) prevents duplicate emails regardless of trigger source.
- Browser path also marks notified after kicking off the sub-workflow, so the next cron skips that prospect.

---

## Test procedure (pre-activation)

1. Pick a Prospects record. Set `project_status = "call_complete"`, populate `call_notes`, leave `scoping_notified_at` empty.
2. Trigger via Manual Trigger.
3. Verify:
   - `Fetch call_complete Prospects` returns 1 record
   - `Send Scoping Ready Email` fires; check Kai's inbox
   - `Mark Notified` PATCHes `scoping_notified_at` to current ISO timestamp
4. Click "Start Scoping Now" in the email.
5. Verify:
   - Browser shows "Scoping Started" page
   - Scoping Agent execution kicks off (check executions)
   - `Mark Notified — Browser Path` updates the timestamp again

---

## Known limitations

- Hourly cron is a fallback. The primary fast path is the Airtable Match Webhook fired by an Airtable automation on `project_status` change.
- The browser GET endpoint at `/trigger-scoping` has no auth — anyone with the URL can trigger Scoping Agent. Mitigated by the `scoping_notified_at` dedup gate in `IF Should Notify` and by the Scoping Agent's own idempotency.
