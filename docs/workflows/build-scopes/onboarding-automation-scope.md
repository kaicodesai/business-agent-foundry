# Workflow Build Scope — [PA] Onboarding Automation
Version: 1.0
Last updated: 2026-03-15
For: workflow-builder-agent

---

## Overview

Build an n8n workflow that runs when a client payment is confirmed. The
workflow sets up the client's project infrastructure: creates their n8n
workspace, creates the credentials template, creates the ClickUp project,
updates Airtable, and writes a readiness summary.

---

## Trigger

- **Node type:** Webhook
- **Event:** POST — payment confirmation from payment platform (Stripe or equivalent)
- **Path:** `/webhook/payment-confirmed`
- **Expected payload fields:**
  - `client_name` (string)
  - `client_email` (string)
  - `package` (string: `starter-build` | `growth-package` | `agency-retainer`)
  - `payment_id` (string)
  - `payment_confirmed_at` (ISO 8601 string)
- **Filter:** Only fire if `payment_status = paid`. Ignore pending or failed events.

---

## Build Order

Build and test each node before proceeding to the next.

### Node 1 — Validate payload (IF node)

**Type:** IF
**Purpose:** Confirm required fields are present before processing
**Condition:** `client_name` is not empty AND `client_email` is not empty AND `payment_status = paid`
**True branch:** Continue to Node 2
**False branch:** Route to error workflow

### Node 2 — Derive client slug (Code node)

**Type:** Code
**Purpose:** Generate client slug from client_name
**Logic:**
```javascript
const name = $input.first().json.client_name;
const slug = name.toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .trim();
return [{ json: { ...$input.first().json, client_slug: slug } }];
```
**Output fields added:** `client_slug`

### Node 3 — Airtable lookup (Airtable node — Search)

**Type:** Airtable
**Credential:** `pa-airtable`
**Purpose:** Read lead record to get any additional context (lead_score, package details)
**Operation:** Search
**Filter by formula:** `{email} = '{{$json.client_email}}'`
**Output fields used:** `lead_score_grade`, `industry` (pass through to later nodes)

### Node 4 — Create n8n workspace (HTTP Request node)

**Type:** HTTP Request
**Purpose:** Create client project folder in n8n
**Method:** POST
**URL:** `http://localhost:5678/api/v1/projects`
**Credential:** `pa-n8n-api`
**Body:**
```json
{
  "name": "{{ $json.client_slug }}"
}
```
**Output fields used:** `id` (save as `workspace_id`)
**On error:** Route to error workflow

### Node 5 — Read scope-of-work (HTTP Request or Read Binary File)

**Type:** HTTP Request (if scope stored in Airtable) or Read Binary File (if on local filesystem)
**Purpose:** Extract `Tools required:` list from scope-of-work.md
**If Airtable:** GET the `scope_of_work` field from the client Airtable record
**Output:** `tools_required` array

> **Builder note:** Coordinate with owner on where scope-of-work content is
> stored at build time. If stored as a file, use filesystem read. If stored
> in Airtable, use Airtable node. Do not proceed if tools list is empty —
> route to error workflow with message "scope-of-work tools list is empty".

### Node 6 — Create credentials template workflow (HTTP Request node)

**Type:** HTTP Request
**Credential:** `pa-n8n-api`
**Method:** POST
**URL:** `http://localhost:5678/api/v1/workflows`
**Body:** JSON workflow object with:
- `name`: `{{ $json.client_slug }}-credentials-template`
- `projectId`: `{{ $json.workspace_id }}`
- `nodes`: one placeholder node per tool in `tools_required`
- `active`: `false`

**Node placeholder structure per tool:**
```json
{
  "id": "cred-[tool-slug]",
  "name": "[Tool Name] Credentials",
  "type": "n8n-nodes-base.[nodeType]",
  "parameters": {},
  "credentials": {}
}
```

**Output fields used:** `id` (save as `credentials_template_id`)

### Node 7 — Create ClickUp project (ClickUp node)

**Type:** ClickUp
**Credential:** `pa-clickup`
**Operation:** Create List (or Create Space, depending on ClickUp structure)
**Name:** `{{ $json.client_slug }}`
**Space:** Phoenix Automation delivery space
**On error:** Log error to Set node, continue (ClickUp failure is non-blocking)

### Node 8 — Update Airtable record (Airtable node)

**Type:** Airtable
**Credential:** `pa-airtable`
**Operation:** Update Record
**Match by:** `email = {{ $json.client_email }}`
**Fields to update:**
- `project_status`: `onboarding.in_progress`
- `client_slug`: `{{ $json.client_slug }}`
- `n8n_workspace_id`: `{{ $json.workspace_id }}`
- `n8n_credentials_template_id`: `{{ $json.credentials_template_id }}`
- `clickup_project_id`: `{{ $json.clickup_project_id }}`
- `onboarding_started_at`: `{{ $now.toISO() }}`

### Node 9 — Send internal summary email (Email/SMTP node)

**Type:** Send Email
**Credential:** `pa-smtp`
**To:** owner email address (hardcoded — this is always Phoenix Automation's owner)
**Subject:** `Onboarding started — {{ $json.client_slug }}`
**Body:** Plain text summary:
```
Client: {{ $json.client_name }}
Package: {{ $json.package }}
Slug: {{ $json.client_slug }}
n8n workspace: {{ $json.workspace_id }}
Credentials template: {{ $json.credentials_template_id }}
ClickUp project: {{ $json.clickup_project_id }}
Tools requiring credentials: {{ $json.tools_required.join(', ') }}

Next step: Send credential setup instructions to the client.
Full readiness checklist: docs/clients/{{ $json.client_slug }}/onboarding-readiness.md
```

---

## Error Handling

- Connect this workflow's error trigger to the Phoenix Automation standard error-handling workflow
- Error workflow must: log to Airtable (`workflow_errors` table), notify owner via email
- Node 4 (workspace creation) failure: route immediately to error workflow — this is a hard failure
- Node 7 (ClickUp) failure: non-blocking — log and continue
- All other node failures: route to error workflow

---

## Credentials

All credential references must use named credentials from the Phoenix Automation
internal credential store. Do not hardcode any values.

| Credential name | Used by |
|----------------|---------|
| `pa-airtable` | Nodes 3, 8 |
| `pa-n8n-api` | Nodes 4, 6 |
| `pa-clickup` | Node 7 |
| `pa-smtp` | Node 9 |

---

## Test Data

```json
{
  "client_name": "Test Company",
  "client_email": "test@testcompany.example",
  "package": "starter-build",
  "payment_id": "pi_test_12345",
  "payment_confirmed_at": "2026-03-15T10:00:00Z",
  "payment_status": "paid"
}
```

Expected output on test run:
- n8n workspace created named `test-company`
- Credentials template created named `test-company-credentials-template`
- ClickUp project created named `test-company`
- Airtable record updated with workspace ID and `project_status: onboarding.in_progress`
- Owner receives summary email

After test: delete test workspace and ClickUp project. Update Airtable test record to `project_status: test-complete`.

---

## Expected Output (production)

A successful run produces:
1. Client n8n workspace/project folder (`[client-slug]`)
2. `[client-slug]-credentials-template` workflow — inactive, containing one placeholder credential node per scoped tool
3. ClickUp project — active, ready for owner to assign tasks
4. Airtable record — `project_status: onboarding.in_progress` with all IDs populated
5. Owner notification email with full summary and next steps
