# Workflow Build Scope — [PA] Status Update Agent
Version: 1.0
Last updated: 2026-03-15
For: workflow-builder-agent

---

## Overview

Build an n8n workflow that runs every Monday morning, reads ClickUp project
data for every live client, generates a status email using Claude, sends it
to the client, and logs the delivery to Airtable.

---

## Trigger

- **Node type:** Schedule Trigger
- **Frequency:** Every week
- **Day:** Monday
- **Time:** 09:00 (owner local time — set timezone on the trigger node)

---

## Build Order

Build and test each node individually before proceeding to the next.

### Node 1 — Fetch active clients (Airtable node)

**Type:** Airtable
**Credential:** `pa-airtable`
**Operation:** Search Records
**Filter by formula:** `{project_status} = 'live'`
**Fields to return:** `client_name`, `client_email`, `clickup_project_id`,
`client_slug`, `client_timezone`, `record_id`

**Test:** Confirm at least one record is returned. If zero, workflow exits
cleanly (no error).

### Node 2 — Check for active clients (IF node)

**Type:** IF
**Condition:** Number of items from Node 1 > 0
**True branch:** Continue to Node 3
**False branch:** Exit — log `no_active_clients` to n8n execution note

### Node 3 — Loop over clients (Loop Over Items node)

**Type:** Loop Over Items
**Input:** All client records from Node 1
**Batch size:** 1 (process one client at a time)

### Node 4 — Get ClickUp tasks (ClickUp node)

**Type:** ClickUp
**Credential:** `pa-clickup`
**Operation:** Get All Tasks
**Project/List ID:** `{{ $json.clickup_project_id }}`
**Filters:**
- Include tasks updated in the last 7 days
- Return fields: `name`, `status`, `due_date`, `date_updated`

**On error (project not found):** Route to error-skip node (Node 4a), continue loop

### Node 4a — Error skip (Set node)

**Type:** Set
**Purpose:** Log the error and continue to next client
**Set:** `skip_reason = clickup_project_not_found`, `client_slug = {{ $json.client_slug }}`
**Route:** Back to Loop Over Items (skip remaining nodes for this client)

### Node 5 — Structure task data (Code node)

**Type:** Code
**Purpose:** Categorise tasks into completed/in-progress/blocked/next-milestone
**Logic:**
```javascript
const tasks = $input.all().map(t => t.json);
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

const completed = tasks.filter(t =>
  ['complete', 'done', 'closed'].includes(t.status?.status?.toLowerCase()) &&
  new Date(t.date_updated).getTime() > sevenDaysAgo
).map(t => t.name);

const inProgress = tasks.filter(t =>
  ['in progress', 'in review', 'doing'].includes(t.status?.status?.toLowerCase())
).map(t => t.name);

const blocked = tasks.filter(t =>
  ['blocked', 'on hold'].includes(t.status?.status?.toLowerCase())
).map(t => t.name);

const upcoming = tasks
  .filter(t => t.due_date && new Date(t.due_date) > Date.now())
  .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  .slice(0, 1)
  .map(t => `${t.name} (due ${new Date(t.due_date).toLocaleDateString()})`);

return [{
  json: {
    ...$('Loop Over Items').first().json,
    completed: completed.join('\n- ') || 'None this week',
    inProgress: inProgress.join('\n- ') || 'None',
    blocked: blocked.join('\n- ') || 'None',
    nextMilestone: upcoming[0] || 'No upcoming milestones set'
  }
}];
```

### Node 6 — Generate email with Claude (HTTP Request node)

**Type:** HTTP Request
**Method:** POST
**URL:** `https://api.anthropic.com/v1/messages`
**Credential:** `pa-anthropic`
**Headers:**
```json
{
  "x-api-key": "{{ $credentials.anthropicApi.apiKey }}",
  "anthropic-version": "2023-06-01",
  "content-type": "application/json"
}
```
**Body:**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 400,
  "messages": [{
    "role": "user",
    "content": "You are writing a weekly project status update for a client of Phoenix Automation. Keep it professional, brief, and plain-language — no jargon. Under 200 words.\n\nClient: {{ $json.client_name }}\nWeek ending: {{ $now.toFormat('MMMM d, yyyy') }}\n\nCompleted this week:\n- {{ $json.completed }}\n\nIn progress:\n- {{ $json.inProgress }}\n\nBlocked:\n- {{ $json.blocked }}\n\nComing up next:\n{{ $json.nextMilestone }}\n\nWrite the email body only. No subject line. Start directly with the update. End with: 'Questions? Reply to this email.'"
  }]
}
```
**Extract from response:** `content[0].text` → save as `email_body`

### Node 7 — Send email (Send Email node)

**Type:** Send Email
**Credential:** `pa-smtp`
**To:** `{{ $json.client_email }}`
**Subject:** `{{ $json.client_name }} — Project Update {{ $now.toFormat('MMMM d') }}`
**Body:** `{{ $json.email_body }}`
**From name:** Phoenix Automation
**From email:** owner email (set in SMTP credential)
**Reply-to:** owner email

### Node 8 — Update Airtable (Airtable node)

**Type:** Airtable
**Credential:** `pa-airtable`
**Operation:** Update Record
**Record ID:** `{{ $json.record_id }}`
**Fields to update:**
- `last_status_update_sent_at`: `{{ $now.toISO() }}`
- `status_update_count`: (formula: current value + 1 — use Airtable formula field or read-then-write)

---

## Error Handling

- Connect to Phoenix Automation standard error-handling workflow
- Error workflow: log to Airtable errors table, notify owner via email
- Per-client errors (Node 4): non-blocking — skip client and continue loop
- Global errors (Node 1 Airtable fail, Node 6 Claude API fail): route to error workflow, halt run

---

## Credentials

| Credential name | Used by |
|----------------|---------|
| `pa-airtable` | Nodes 1, 8 |
| `pa-clickup` | Node 4 |
| `pa-anthropic` | Node 6 |
| `pa-smtp` | Node 7 |

---

## Test Data

Set one Airtable record to `project_status = live` with a valid
`clickup_project_id` pointing to a test ClickUp project. Populate the
test project with 2–3 tasks in various statuses.

Expected test output:
- One email generated and sent (to owner's email during testing — not client)
- Airtable `last_status_update_sent_at` updated on the test record
- Claude generates a coherent, under-200-word status email from the task data

After test: reset Airtable test record, confirm email was received.

---

## Expected Output (production)

For each active client processed:
1. One status email in the client's inbox every Monday
2. Airtable `last_status_update_sent_at` updated
3. Clean n8n execution log with no errors
