# SOP — Referral Trigger Agent
Version: 1.0
Last updated: 2026-03-15

## Purpose
Sends an automated 2-touch referral request sequence exactly 30 days after
client launch — converting happy clients into referral sources without manual
outreach.

## When to Run
Automatically — n8n daily check. Fires for any client whose
`project_launch_date` was exactly 30 days ago, `project_status = live`, and
`referral_sequence_sent` is blank or false.

## Prerequisites

- [ ] `project_launch_date` is set in Airtable for each live client
- [ ] `automations_delivered` field is populated in Airtable
- [ ] Instantly.ai campaign workspace is active
- [ ] Anthropic API credential is active
- [ ] `referral_sequence_sent` is blank or false for the qualifying client

## Steps

1. **Daily cron runs** — workflow checks Airtable for clients 30 days post-launch.

2. **Agent reads project outcomes** — `automations_delivered`, `last_month_time_saved_hrs`, client details.

3. **Agent generates 2-touch sequence with Claude** — Email 1 (warm referral
   ask with specific automation callout) + Email 2 (7-day follow-up).

4. **Agent queues sequence in Instantly.ai** — Email 1 sends immediately
   (or next business day morning), Email 2 sends 7 days later.

5. **Agent sets `referral_sequence_sent = true`** in Airtable with timestamp.

6. **Owner monitors Instantly.ai** for referral replies — handles all replies manually.

7. **If a referral is generated** — owner records referral source on the new
   Airtable lead record. New lead enters the normal pipeline.

## Expected Outputs

- 2-touch referral sequence queued in Instantly.ai per qualifying client
- `referral_sequence_sent = true` in Airtable — prevents re-send
- Owner notified (via n8n or Airtable) that sequence was queued

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| `project_launch_date` not set | Client never qualifies | Owner sets launch date in Airtable on day of activation |
| `automations_delivered` blank | Agent skips client, flags owner | Owner populates the field (list of automation names delivered) |
| Instantly.ai API error | Sequence not queued | Check API key; re-run manually for affected client |
| `referral_sequence_sent` was reset accidentally | Client receives duplicate send | Owner must manually set flag back to true; investigate why it was reset |

## Owner Confirmation Points

- **At project activation:** Set `project_launch_date` in Airtable on the
  same day workflows go live. This is the clock that triggers this agent.
- **At project delivery:** Populate `automations_delivered` in Airtable with
  the plain-English names of what was built (e.g. "Shopify-to-Xero order
  sync, Lead qualifier chatbot").
- **Before first activation:** Send a test referral email to yourself to
  confirm Claude's output quality and tone. Adjust the prompt in n8n if needed.
- **When a referral replies:** Handle the reply personally. Book an assessment
  call, record the source. Do not route referral replies through any automated flow.
