# SOP — Status Update Agent
Version: 1.0
Last updated: 2026-03-15

## Purpose
Sends automated weekly project status emails to all active clients from
ClickUp task data. No manual drafting required from the owner.

## When to Run
Automatically — n8n cron trigger fires every Monday at 9:00 AM in the
owner's local time. Can also be triggered manually in n8n for one-off
runs (e.g. a client requests an update outside the normal schedule).

## Prerequisites

- [ ] At least one client has `project_status = live` in Airtable
- [ ] Each live client has a `clickup_project_id` in their Airtable record
- [ ] ClickUp project is populated with tasks and milestones
- [ ] Anthropic API credential is active
- [ ] SMTP credential is active
- [ ] Airtable credential is active

## Steps

1. **Cron fires Monday 9:00 AM** — workflow starts automatically.

2. **Agent queries Airtable** — retrieves all records where
   `project_status = live`. If zero: run completes with no action.

3. **Agent loops over each active client** — processes them sequentially.

4. **Agent reads ClickUp** — fetches completed, in-progress, blocked tasks
   and next milestone for each client's project.

5. **Agent generates email with Claude** — `claude-sonnet-4-6` writes the
   status email body from ClickUp data. Under 200 words, plain language.

6. **Agent sends email** — to `client_email` with subject
   `[client_name] — Project Update [date]`.

7. **Agent updates Airtable** — logs `last_status_update_sent_at` and
   increments `status_update_count`.

8. **Owner spot-checks** — once per month, owner reads a sample of outgoing
   status emails to confirm quality. Owner checks n8n execution log to
   confirm all live clients were processed.

## Expected Outputs

- One status email sent per active client per week
- Airtable `last_status_update_sent_at` updated for each client
- n8n execution log shows completed run with no errors

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| No active clients | Run completes, no emails sent | Check Airtable — verify at least one client is in `live` status |
| ClickUp project not found | Client skipped, error logged | Verify `clickup_project_id` in Airtable is correct |
| Anthropic API error | Email not generated for client | Check API key validity; re-run manually for affected client |
| SMTP send failure | Email not delivered | Check SMTP credential; retry send manually |
| Client reports not receiving emails | Delivery issue | Check n8n execution log; check client spam folder |
| Status email content is stale or incorrect | ClickUp data is outdated | Owner updates ClickUp task statuses — this agent only reflects what ClickUp contains |

## Owner Confirmation Points

- **Before first activation:** Verify the cron schedule fires in the correct
  timezone. Send a test run to the owner's own email address first.
- **Before adding a new live client:** Confirm `clickup_project_id` is set
  in Airtable and the ClickUp project has at least some tasks populated.
- **Monthly:** Spot-check one or two outgoing emails for quality. If Claude's
  output degrades, review the prompt in the n8n workflow and adjust.
