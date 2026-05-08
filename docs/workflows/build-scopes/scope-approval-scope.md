# Workflow Build Scope — [PA] Scope Approval
Version: 1.0
Last updated: 2026-05-08
For: workflow-builder-agent
Source of truth: live n8n workflow `UB6ZdrnYpJlYfxD4` (`[PA] Scope Approval`) as of 2026-05-08

---

## Overview

The Scope Approval workflow handles the owner's review decision on a generated scope. It exposes two GET endpoints — one for approve, one for reject — both linked from the Scoping Agent's review email.

- **Approve path** — locks the scope, generates a client-ready proposal email via OpenRouter, saves it to Airtable, creates a Gmail draft, creates a ClickUp review task, and notifies the owner that everything is ready to send.
- **Reject path** — clears the generated scope/proposal fields and resets `project_status` back to `call_complete`, sending the prospect back into the Scoping Agent's queue (after the owner amends `call_notes`).

Both paths are idempotent — re-clicking either link does nothing destructive.

---

## Triggers

| Trigger | Type | Path | Use |
|---------|------|------|-----|
| `Approve Scope Webhook` | Webhook GET | `/approve-scope?client_slug=X` | Owner clicks "Approve Scope" in the Scoping Agent review email |
| `Reject Scope Webhook` | Webhook GET | `/reject-scope?client_slug=X` | Owner clicks "Reject Scope" in the Scoping Agent review email |

Both use `responseMode: responseNode` so the workflow can respond with an HTML status page after completing.

---

## Data flow — Approve path

```
Approve Scope Webhook (/approve-scope?client_slug=X)
        └─▶ Fetch Client by Slug (Airtable)
                └─▶ Prepare Approval Request (Code — idempotency check)
                        └─▶ IF Should Create Proposal
                                ├─ false ─▶ Respond — Approval Skipped (already approved or missing)
                                └─ true  ─▶ Lock Scope in Airtable (PATCH scope_locked_at + project_status='proposal_sent')
                                                └─▶ Claude — Proposal (OpenRouter — ~moonshotai/kimi-latest)
                                                        └─▶ Save Proposal to Airtable (PATCH proposal_draft)
                                                                ├─▶ Create ClickUp Proposal Review Task
                                                                └─▶ Create Gmail Proposal Draft
                                                                        └─▶ Email Proposal to Kai
                                                                                └─▶ Respond to Browser
```

## Data flow — Reject path

```
Reject Scope Webhook (/reject-scope?client_slug=X)
        └─▶ Fetch Reject Prospect by Slug (Airtable)
                └─▶ Prepare Reject Request (Code)
                        └─▶ IF Can Reject Scope
                                ├─ false ─▶ Respond — Scope Rejected ("no prospect found" message)
                                └─ true  ─▶ Reset Rejected Scope (PATCH clears scope/proposal fields)
                                                └─▶ Respond — Scope Rejected (success message)
```

---

## Idempotency

`Prepare Approval Request` checks three conditions and skips proposal generation if any is true:
```js
alreadyApproved = Boolean(
  fields.scope_locked_at ||
  fields.proposal_draft ||
  fields.project_status === 'proposal_sent'
);
```

This protects against:
- Email previewers (Gmail/Outlook) prefetching the link
- Owner re-clicks (network glitch, browser back button)
- Duplicate triggers from forwarded emails

`Prepare Reject Request` is similar — if the slug doesn't resolve to a Prospects record, it returns the friendly "no prospect found" message instead of erroring.

---

## Node-by-node spec — Approve path

### 1. `Approve Scope Webhook`
- **Path:** `approve-scope`
- **Method:** GET
- **responseMode:** `responseNode`

### 2. `Fetch Client by Slug` — HTTP Request (Airtable)
- **continueOnFail:** `true`, retryOnFail 3 × 2000ms
- **URL:** `https://api.airtable.com/v0/.../tbluEsKoQ2p49ktVq?filterByFormula={client_slug}="{{ $json.query.client_slug }}"`

### 3. `Prepare Approval Request` — Code

```js
const records = $json.records || [];
const record = records[0] || null;
const fields = record?.fields || {};
const slug = $json.query?.client_slug || fields.client_slug || '';
const alreadyApproved = Boolean(fields.scope_locked_at || fields.proposal_draft || fields.project_status === 'proposal_sent');
const missing = !record;
return [{ json: {
  record_id: record?.id || '',
  client_slug: slug,
  company_name: fields.company_name || 'client',
  can_create_proposal: Boolean(record && !alreadyApproved),
  approval_message: missing ? 'No prospect was found...' : (alreadyApproved ? 'This scope has already been approved...' : 'Creating proposal draft.'),
  already_approved: alreadyApproved,
  missing_record: missing,
} }];
```

### 4. `IF Should Create Proposal` — IF
Condition: `Boolean($json.can_create_proposal)`. False → `Respond — Approval Skipped`.

### 5. `Lock Scope in Airtable` — HTTP Request (Airtable PATCH)
- **URL:** `https://api.airtable.com/v0/.../tbluEsKoQ2p49ktVq/{{ $json.record_id }}`
- **retryOnFail:** 3 × 2000ms
- **Body:** `{ fields: { scope_locked_at: new Date().toISOString(), project_status: "proposal_sent" } }`

### 6. `Claude — Proposal` — HTTP Request (OpenRouter)
- **URL:** `https://openrouter.ai/api/v1/chat/completions`
- **Credential:** `openRouterApi`
- **retryOnFail:** 3 × default
- **timeout:** 300000ms
- **Body:**
```json
{
  "model": "~moonshotai/kimi-latest",
  "max_tokens": 1400,
  "reasoning": { "effort": "none", "exclude": true },
  "messages": [{ "role": "user", "content": "<see prompt below>" }]
}
```

**Prompt:**
```
Write a professional, client-ready proposal email draft for Phoenix Automation.
Return only the email draft body, no markdown fences, no tables, no horizontal
rules, no dash separators, and no invented links. Keep it concise, clear, and
human. Use short section headings and short paragraphs. The owner will edit
before sending. Do not invent an exact final price. Use the tier placeholder
exactly as provided. Use kai@phoenixautomation.ai only. Make client-owned
software/API costs separate from Phoenix Automation pricing. Include these
sections: greeting, brief call context, what we will build, how it helps,
investment, next step, signature.

Client data: <JSON.stringify(record.fields)>

Pricing rules: Starter Build = [OWNER TO SET FINAL PRICE: $1,500-$3,000].
Growth Package = [OWNER TO SET FINAL PRICE: $3,000-$7,000]. Agency Retainer =
[OWNER TO SET RETAINER: $500-$1,500/month]. Choose the placeholder that
matches service_tier. Never output $[X]. Software/API note: Client-owned
software/API costs are separate and typically run about $50-$300/month
depending on final tools and usage.
```

### 7. `Save Proposal to Airtable` — HTTP Request (Airtable PATCH)
- **URL:** `https://api.airtable.com/v0/.../tbluEsKoQ2p49ktVq/{{ ($("Fetch Client by Slug").item.json.records||[])[0]?.id }}`
- **retryOnFail:** 3 × 2000ms
- **Body:** `{ fields: { proposal_draft: <LLM content with multi-shape extraction> } }`

### 8. `Create ClickUp Proposal Review Task` — HTTP Request (ClickUp)
- **continueOnFail:** `true`, retryOnFail 3 × 2000ms
- **URL:** `https://api.clickup.com/api/v2/list/901414699479/task`
- Task body includes: company name, contact, email, tier, tags `["proposal", "owner-review"]`, and the full `proposal_draft` text in the description for offline review.

### 9. `Create Gmail Proposal Draft` — Gmail
- **continueOnFail:** `true`, retryOnFail 3 × 2000ms
- **resource:** `draft`, **operation:** `create`
- **Subject:** `Proposal for {{ company_name || "your automation project" }}`
- **Body:** the saved `proposal_draft` text
- **sendTo:** the prospect's email
- **replyTo:** `kai@phoenixautomation.ai`

### 10. `Email Proposal to Kai` — Email Send (SMTP)
- **continueOnFail:** `true`, retryOnFail 3 × 2000ms
- **Subject:** `Proposal draft created in Gmail - {{ company_name }}`
- HTML body shows Company, Contact, Draft recipient, **Gmail draft ID** (or error from `Create Gmail Proposal Draft`), and Slug. Includes a "Next owner action" callout: open Gmail Drafts → review → set price → send.

### 11. `Respond to Browser` — Respond to Webhook
Returns 200 + `text/html` with a "Proposal draft created" confirmation card.

### 12. `Respond — Approval Skipped` — Respond to Webhook
Returns 200 + `text/html` with `$json.approval_message` (the friendly skip message generated in `Prepare Approval Request`).

---

## Node-by-node spec — Reject path

### 13. `Reject Scope Webhook`
- **Path:** `reject-scope`
- **Method:** GET
- **responseMode:** `responseNode`

### 14. `Fetch Reject Prospect by Slug` — HTTP Request (Airtable)
- **continueOnFail:** `true`, retryOnFail 3 × 2000ms
- Same query shape as `Fetch Client by Slug`.

### 15. `Prepare Reject Request` — Code
Resolves record / company name. Sets `can_reject` to true if a record was found, false otherwise. Builds a friendly user-facing `message` either way.

### 16. `IF Can Reject Scope` — IF
Condition: `Boolean($json.can_reject)`. False → `Respond — Scope Rejected` with the "no prospect found" message.

### 17. `Reset Rejected Scope` — HTTP Request (Airtable PATCH)
- **retryOnFail:** 3 × 2000ms
- **Body:**
```js
{ fields: {
  project_status: "call_complete",
  scope_summary: "", scope_of_work: "",
  service_tier: null, automation_count: null,
  automation_1_name: "", automation_1_description: "",
  automation_2_name: "", automation_2_description: "",
  automation_3_name: "", automation_3_description: "",
  tools_required: "",
  proposal_draft: "",
  scope_locked_at: null
} }
```

The prospect goes back to `call_complete` with all generated fields cleared. Owner amends `call_notes` and the next cron / webhook re-runs Scoping Agent. `outreach_status` is intentionally NOT reset — once `converted`, it stays converted.

### 18. `Respond — Scope Rejected` — Respond to Webhook
Returns 200 + `text/html` with `$json.message`. Single response node serves both the success-rejected and the no-prospect-found cases.

---

## Error handling summary

| Node | continueOnFail | retryOnFail | Failure path |
|------|----------------|-------------|--------------|
| Fetch Client by Slug | ✅ | 3 × 2000ms | Logged; Prepare Approval Request returns "missing record" message |
| Lock Scope in Airtable | — | 3 × 2000ms | Halts after retries (no proposal generated) |
| Claude — Proposal | — | 3 × default | Halts after retries (no fallback model wired) |
| Save Proposal to Airtable | — | 3 × 2000ms | Halts after retries |
| Create ClickUp Proposal Review Task | ✅ | 3 × 2000ms | Logged; the email shows "Check ClickUp manually" |
| Create Gmail Proposal Draft | ✅ | 3 × 2000ms | Logged; the email surfaces the error in the draft-id field |
| Email Proposal to Kai | ✅ | 3 × 2000ms | Logged; flow still responds to browser |
| Fetch Reject Prospect by Slug | ✅ | 3 × 2000ms | Logged; Prepare Reject Request returns "missing" message |
| Reset Rejected Scope | — | 3 × 2000ms | Halts after retries (owner sees error rather than false success) |

Global error workflow: `JByknkdAgxRmDKp3`.

---

## Credentials

| Credential name | Type | Used by |
|-----------------|------|---------|
| `Airtable Personal Access Token account` | Airtable Token API | All Airtable HTTP nodes |
| `openRouterApi` | OpenRouter API | Claude — Proposal |
| `SMTP account 2` | SMTP | Email Proposal to Kai |
| `Gmail account 2` | Gmail OAuth2 | Create Gmail Proposal Draft |
| `ClickUp account` | ClickUp API | Create ClickUp Proposal Review Task |

---

## Airtable schema dependencies

Prospects table (`tbluEsKoQ2p49ktVq`):
- Read: `client_slug`, `company_name`, `prospect_name`, `email`, `service_tier`, `scope_locked_at`, `proposal_draft`, `project_status`, all `automation_*` fields, `tools_required`
- Write (approve): `scope_locked_at`, `project_status` (→ `proposal_sent`), `proposal_draft`
- Write (reject): all generated scope/proposal fields cleared; `project_status` (→ `call_complete`)

---

## ClickUp dependencies

- **List ID:** `901414699479` (proposal review list)
- Tags applied to created tasks: `proposal`, `owner-review`
- Status: `to do`, Priority: 3 (normal)

---

## Test procedure (pre-activation)

### Approve path
1. Identify a Prospects record with `project_status = "scope_review"` and a populated scope from Scoping Agent.
2. Hit `https://kaiashley.app.n8n.cloud/webhook/approve-scope?client_slug=<slug>` in a browser.
3. Verify:
   - `Lock Scope in Airtable` PATCHes `scope_locked_at` + `project_status = "proposal_sent"`
   - `Claude — Proposal` returns 200
   - `Save Proposal to Airtable` populates `proposal_draft`
   - A Gmail draft appears in Drafts addressed to the prospect's email
   - A ClickUp task is created in list `901414699479`
   - Owner receives `Email Proposal to Kai` showing the Gmail draft ID
   - Browser shows "Proposal draft created" page

### Idempotency
4. Hit the same `/approve-scope` URL again.
5. Verify:
   - No new Gmail draft, no new ClickUp task, no new owner email
   - Browser shows "Scope approval already handled"
   - Airtable `proposal_draft` is unchanged

### Reject path
6. On a different test record, hit `https://kaiashley.app.n8n.cloud/webhook/reject-scope?client_slug=<slug>`.
7. Verify:
   - All generated `scope_*`, `automation_*`, `tools_required`, `proposal_draft`, `scope_locked_at` fields are cleared
   - `project_status` reverts to `call_complete`
   - `outreach_status` stays `converted`
   - Browser shows "Scope rejected" page

### Bad slug
8. Hit `/approve-scope?client_slug=does-not-exist`.
9. Verify the friendly "No prospect was found for this approval link" page (no Airtable writes).

---

## Known limitations

- LLM model identifier `~moonshotai/kimi-latest` is unverified (the leading `~` is unusual for OpenRouter syntax). Smoke-test before relying on it. No fallback model is wired for the Claude — Proposal node — if it fails after 3 retries, the workflow halts and the scope stays locked with no proposal_draft.
- The webhooks are unauthenticated GETs. Idempotency mitigates the damage from accidental triggers, but anyone with the URL can call them.
- ClickUp task creation is in parallel with the Gmail+email branch — its outcome is now surfaced via the `Create Gmail Proposal Draft` node ID lookup in the email, but a ClickUp-specific failure status is best inspected via n8n executions.
- The reject path does not preserve `outreach_status` history — once a prospect is `converted`, that fact survives a reject.
