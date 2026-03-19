# Workflow Build Scope — reporting-agent
Version: 1.0
Last updated: 2026-03-15
For: workflow-builder-agent

---

## Overview

Build an n8n workflow that fires on the 1st of every month, reads execution
logs for each retainer client's n8n workflows, generates a monthly performance
report via Claude, emails it to the client, and logs delivery to Airtable.

---

## Trigger

- **Node type:** Schedule Trigger
- **Frequency:** Every month
- **Day:** 1st
- **Time:** 08:00 (owner local time)

---

## Build Order

### Node 1 — Fetch retainer clients (Airtable)

**Credential:** `airtable-phoenix-automation`
**Filter:** `AND({project_status} = 'live', FIND('agency-retainer', {service_tier}))`
**Fields:** `client_name`, `client_email`, `n8n_workflow_ids`, `client_slug`,
`record_id`, `hours_saved_per_run`

**IF after:** If count = 0, exit cleanly.

### Node 2 — Loop over clients (Loop Over Items)

**Batch size:** 1

### Node 3 — Check workflow IDs (IF node)

**Condition:** `n8n_workflow_ids` is not empty
**False branch:** Set `skip_reason = missing_workflow_ids`, route to error-notification node (non-blocking)

### Node 4 — Split workflow IDs (Code node)

```javascript
const ids = $json.n8n_workflow_ids.split(',').map(id => id.trim());
return ids.map(id => ({ json: { ...$json, workflow_id: id } }));
```

### Node 5 — Fetch executions per workflow (HTTP Request — n8n API)

**URL:** `http://localhost:5678/api/v1/executions?workflowId={{ $json.workflow_id }}&startedAfter={{ $now.minus({days: 30}).toISO() }}&limit=100`
**Credential:** `n8n-internal-api`
**Method:** GET

### Node 6 — Aggregate execution metrics (Code node)

Runs after all workflow IDs are fetched. Aggregate:
```javascript
const allExecutions = $input.all().map(e => e.json).flat();
const total = allExecutions.length;
const successful = allExecutions.filter(e => e.status === 'success').length;
const failed = allExecutions.filter(e => e.status === 'error').length;
const uptime = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;

const hoursPerRun = $('Loop over clients').first().json.hours_saved_per_run || 0.1;
const timeSaved = (successful * hoursPerRun).toFixed(1);

const errorTypes = [...new Set(
  allExecutions
    .filter(e => e.status === 'error' && e.data?.resultData?.error?.message)
    .map(e => e.data.resultData.error.message)
)].slice(0, 3);

return [{ json: {
  ...$('Loop over clients').first().json,
  total_executions: total,
  successful_executions: successful,
  failed_executions: failed,
  uptime_pct: uptime,
  time_saved_hours: timeSaved,
  error_types: errorTypes.join('; ') || 'None'
}}];
```

### Node 7 — Generate report (HTTP Request — Anthropic API)

**URL:** `https://api.anthropic.com/v1/messages`
**Credential:** `anthropic-api`
**Body:**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 500,
  "messages": [{
    "role": "user",
    "content": "Write a monthly automation performance report for a client of Phoenix Automation. Professional tone, plain language. Under 300 words. Data-first.\n\nClient: {{ $json.client_name }}\nReport period: {{ $now.minus({months: 1}).toFormat('MMMM yyyy') }}\n\nData:\n- Total automation runs: {{ $json.total_executions }}\n- Successful runs: {{ $json.successful_executions }}\n- Uptime: {{ $json.uptime_pct }}%\n- Errors caught and handled: {{ $json.failed_executions }}\n- Estimated time saved: {{ $json.time_saved_hours }} hours\n- Errors (if any): {{ $json.error_types }}\n\nStructure:\n1. One sentence on what the automations accomplished this month\n2. Performance table (runs, uptime, time saved)\n3. If errors > 0: brief plain-language note on what was caught and handled\n4. One-sentence closing that reinforces ongoing value\n5. End with: 'Questions about your automations? Reply here.'\n\nDo not invent data. If a metric is zero, state it."
  }]
}
```
**Extract:** `content[0].text` → `report_body`

### Node 8 — Send email (Send Email)

**Credential:** `smtp-phoenix-automation`
**To:** `{{ $json.client_email }}`
**Subject:** `{{ $json.client_name }} — Automation Report {{ $now.minus({months:1}).toFormat('MMMM yyyy') }}`
**Body:** `{{ $json.report_body }}`

### Node 9 — Update Airtable (Airtable)

**Operation:** Update Record
**Record ID:** `{{ $json.record_id }}`
**Fields:**
- `last_report_sent_at`: `{{ $now.toISO() }}`
- `report_count`: (read-then-increment or use Airtable formula field)
- `last_month_executions`: `{{ $json.total_executions }}`
- `last_month_uptime_pct`: `{{ $json.uptime_pct }}`
- `last_month_time_saved_hrs`: `{{ $json.time_saved_hours }}`

---

## Error Handling

- Global: connect to Phoenix Automation error-handling workflow
- Missing workflow IDs (Node 3 false): non-blocking — flag in owner summary, continue loop
- Zero executions: non-blocking — report sends but owner is notified in completion summary
- n8n API / Anthropic / SMTP failures: route to error workflow; halt run for that client

---

## Credentials

| Credential name | Used by |
|----------------|---------|
| `airtable-phoenix-automation` | Nodes 1, 9 |
| `n8n-internal-api` | Node 5 |
| `anthropic-api` | Node 7 |
| `smtp-phoenix-automation` | Node 8 |

---

## Test Data

Set one Airtable record with `project_status = live`, `service_tier = agency-retainer`,
and valid `n8n_workflow_ids`. Ensure the referenced workflows have at least
some execution history.

Expected test output:
- Claude generates a coherent, under-300-word report from the execution data
- Email sent to owner's test address (not client)
- Airtable metrics updated

After test: reset Airtable test record, confirm report was received.
