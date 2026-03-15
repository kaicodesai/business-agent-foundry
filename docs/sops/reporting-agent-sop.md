# SOP — Reporting Agent
Version: 1.0
Last updated: 2026-03-15

## Purpose
Generates and sends monthly automation performance reports to retainer clients
from n8n execution data — proving ongoing value and supporting retainer renewal.

## When to Run
Automatically — n8n cron fires on the 1st of each month. Can be triggered
manually for a specific client if the owner needs an out-of-cycle report.

## Prerequisites

- [ ] At least one client has `service_tier = agency-retainer` AND `project_status = live` in Airtable
- [ ] Each retainer client has `n8n_workflow_ids` populated in Airtable
- [ ] n8n API credential is active (read access to execution logs)
- [ ] Anthropic API credential is active
- [ ] SMTP credential is active

## Steps

1. **Cron fires on the 1st of the month** — workflow starts automatically.

2. **Agent queries Airtable** — retrieves all retainer clients with
   `project_status = live`.

3. **Agent loops over each client** — processes sequentially.

4. **Agent reads n8n execution logs** — fetches last 30 days of executions
   for each workflow ID in `n8n_workflow_ids`.

5. **Agent calculates metrics** — total runs, success rate, uptime %, time
   saved estimate, error summary.

6. **Agent generates report with Claude** — `claude-sonnet-4-6` writes a
   data-backed, plain-language performance summary under 300 words.

7. **Agent sends report by email** — to `client_email`.

8. **Agent updates Airtable** — logs `last_report_sent_at`, execution
   metrics, and increments `report_count`.

9. **Owner reviews flagged items** — any clients with zero executions or
   missing workflow IDs are flagged in the completion summary. Owner
   investigates before the next billing date.

## Expected Outputs

- One performance report email per retainer client per month
- Airtable metrics updated for each client
- Completion summary to owner listing any skipped or flagged clients

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| `n8n_workflow_ids` blank | Client skipped, owner flagged | Owner adds workflow IDs to Airtable — read from n8n |
| Zero executions for client | Flagged — report not sent | Investigate: workflow deactivated? n8n instance issue? |
| n8n API returns error | Execution data unavailable | Check n8n API key; verify n8n instance is healthy |
| Claude API error | Report not generated | Check API key; retry manually for affected client |
| SMTP send failure | Report not delivered | Check SMTP credential; send manually |

## Owner Confirmation Points

- **Before first activation:** Set `hours_saved_per_run` in Airtable for
  each client — this drives the time-saved calculation. Use the estimate
  from the scope-of-work.md or ask the client.
- **Monthly:** Review one or two reports before they go out (trigger a
  manual run on the 28th of each month to preview). Confirm the data
  matches what you know about the client's workflows.
- **On zero-execution flag:** Investigate immediately — this means the client
  is paying for a retainer with no active automations. Fix before the report
  sends or reach out to the client proactively.
