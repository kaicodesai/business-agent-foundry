# Build Log — Phoenix Automation (Internal)

---

## [PA] Onboarding Automation
Built: 2026-03-16 / Updated: 2026-03-22
Build time: ~25 minutes (initial) + ~2h (ClickUp folder+4-lists redesign + end-to-end testing)
Status: **✅ End-to-end PASS — 2026-03-22**

**Workflow ID:** `Ro9IkQBlNaUxKR6B`
**n8n URL:** `http://localhost:5678/workflow/Ro9IkQBlNaUxKR6B`
**Active:** false — owner must activate before first real client

**Workflow summary:**
Triggered by a POST webhook at `/webhook/payment-confirmed` when a Stripe (or
equivalent) payment is confirmed. Validates the payload, derives a client slug,
looks up the client in Airtable, creates a new n8n project workspace, reads
the scope-of-work tools list from Airtable, creates a credentials template
workflow in the client's workspace, creates a ClickUp client folder + 4 lists
(Onboarding/Build/QA/Live) at space level, updates the Airtable client record
with all generated IDs, and sends both the owner summary email and the client
welcome email.

**Nodes built (24 total):**
1. Payment Confirmed Webhook (n8n-nodes-base.webhook) — POST /webhook/payment-confirmed
2. Normalize Payload (n8n-nodes-base.code) — normalises field names from webhook payload
3. Validate Payload (n8n-nodes-base.if) — checks client_name, client_email, payment_status=paid
4. Stop — Invalid Payload (n8n-nodes-base.stopAndError) — false branch of validation
5. Derive Client Slug (n8n-nodes-base.code) — generates slug from client_name
6. Airtable — Lookup Client (n8n-nodes-base.airtable) — search by email (filterByFormula uses double quotes)
7. Merge Airtable Context (n8n-nodes-base.code) — merges lead_score_grade, industry, airtable_record_id
8. Create n8n Workspace (n8n-nodes-base.httpRequest) — POST /api/v1/projects
9. Extract Workspace ID (n8n-nodes-base.code) — validates and extracts workspace_id, hard-fails if missing
10. Read Scope of Work (n8n-nodes-base.airtable) — reads scope_of_work field for tools list
11. Extract Tools Required (n8n-nodes-base.code) — parses tools_required with 3-level fallback; graceful empty handling
12. Create Credentials Template (n8n-nodes-base.httpRequest) — POST /api/v1/workflows, creates placeholder nodes per tool
13. Extract Template ID (n8n-nodes-base.code) — validates and extracts credentials_template_id
14. Create Client ClickUp Folder (n8n-nodes-base.httpRequest) — POST /api/v2/space/90144568071/folder (space level, non-blocking)
15. Extract Folder ID (n8n-nodes-base.code) — extracts clickup_folder_id, hard-fails if missing
16. Create List — Onboarding (n8n-nodes-base.httpRequest) — POST /api/v2/folder/{folder_id}/list
17. Create List — Build (n8n-nodes-base.httpRequest) — POST /api/v2/folder/{folder_id}/list
18. Create List — QA (n8n-nodes-base.httpRequest) — POST /api/v2/folder/{folder_id}/list
19. Create List — Live (n8n-nodes-base.httpRequest) — POST /api/v2/folder/{folder_id}/list
20. Merge ClickUp Folder ID (n8n-nodes-base.code) — merges priorData + clickup_folder_id (success path)
21. Log ClickUp Error — Continue (n8n-nodes-base.code) — logs error, sets clickup_folder_id=null (error path)
22. Update Airtable Record (n8n-nodes-base.httpRequest) — PATCH Airtable record with project_status, all IDs
23. Send Onboarding Summary Email (n8n-nodes-base.emailSend) — plain text summary to owner
24. Send Client Welcome Email (n8n-nodes-base.emailSend) — welcome email to client

**Test results (2026-03-22):**
- End-to-end test: **PASS** (execution 209, Meridian Consulting Group test payload)
  - ClickUp folder `meridian-consulting-group` (ID: `90147998711`) created at space level ✅
  - 4 lists created: Onboarding (901414732632), Build (901414732633), QA (901414732634), Live (901414732635) ✅
  - `clickup_folder_id` written to Airtable ✅
  - Owner summary email sent to lightofkai777@gmail.com ✅
  - Client welcome email sent to ashleyedwards305@gmail.com ✅
- Error handling: Payload validation failure → StopAndError; ClickUp failure is non-blocking (error output routing, continues with null); workspace and credentials template failures hard-fail; n8n error workflow not yet connected (DEFERRED)
- **Test data statement:** All tests used Meridian Consulting Group synthetic record (`ashleyedwards305@gmail.com`). Test ClickUp folder and n8n workspace cleaned up after testing. Airtable "Status Test Client" record reset to `test-complete`.

**Bugs fixed during 2026-03-22 testing:**
1. ClickUp API v2 does not support nested folders — changed `POST /api/v2/folder/{folder_id}/folder` → `POST /api/v2/space/90144568071/folder`
2. HTTP Request node list creation: `jsonBody` used wrong expression format `'{{ }}'` — changed to plain JSON string `{"name": "Onboarding"}` etc.
3. Airtable `filterByFormula` used single quotes — changed to double quotes (known recurring n8n/Airtable bug)
4. `Extract Tools Required` threw hard error on empty tools — changed to graceful warn + continue; added Fallback 2 reading from `Merge Airtable Context`

**Credential mapping:**
| Scope name | n8n credential name | Type | ID |
|---|---|---|---|
| pa-airtable | Airtable (PAT) | airtableTokenApi | airtable_pat_01 |
| pa-n8n-api | n8n account | httpHeaderAuth | o5eIjNSB2LCpMKdO |
| pa-clickup | ClickUp account | clickUpApi | Sb40bHDhf930ydIw |
| pa-smtp | SMTP account | smtp | Q7ahJEa5Tvt4iRHX |

---

## [PA] Lead Generation (Mock Mode)
Built: 2026-03-19 (initial) / fixed 2026-03-20
Build time: ~60 minutes (includes bug fixes)
Status: Built and tested (end-to-end PASS — mock Apollo mode)

**Workflow ID:** `pUqNr2V9Fp5gLWaD`
**n8n URL:** `http://localhost:5678/workflow/pUqNr2V9Fp5gLWaD`
**Active:** false — owner must activate after replacing mock node

**Workflow summary:**
Runs daily at 06:45 (and on manual trigger), fetches ICP-matched prospects from
Apollo.io (currently mocked — see below), deduplicates against the Airtable
Prospects table, writes net-new contacts with `outreach_status = pending`, and
logs a run summary to `automation_logs`.

**Nodes built (13 total):**
1. Schedule Trigger — cron 06:45 daily
2. Manual Trigger — for owner-initiated test runs
3. Fetch ICP Prospects (code) — **MOCK MODE**: returns 3 synthetic test prospects.
   Replace with HTTP Request to `https://api.apollo.io/v1/mixed_people/search` once
   a paid Apollo plan is available. Credential: `pa_apollo_01`.
4. Check Empty Results (if) — routes empty result to Aggregate Run Stats
5. Split Into Items (code) — flattens `people` array, filters out contacts with no email
6. Check Prospect Exists (httpRequest) — GET Airtable Prospects, filterByFormula `{email}='...'`
7. Dedup and Prepare (code, runOnceForAllItems) — index-aligns dedup results with
   prospect data, sets `write_to_airtable` boolean
8. Route New vs Existing (if) — string comparison `String($json.write_to_airtable) === 'true'`
9. Write New Prospect (httpRequest) — POST to Airtable Prospects, sets `outreach_status: pending`
10. Aggregate Run Stats (code) — computes found/added/skipped counts
11. Log Run Summary (httpRequest) — POST to Airtable `automation_logs`
12. Handle Apollo Error (httpRequest) — error path placeholder
13. Log Apollo Error (httpRequest) — error path placeholder

**Test results:**
- Execution 178 (2026-03-20): PASS — 1 prospect written (Alice Test, dedup working)
- Execution 180 (2026-03-20): PASS — 2 prospects written (Bob Sample, Carol Demo), 1 skipped
  (Alice Test — correctly detected as duplicate). All 3 prospects processed by Dedup and
  Prepare (runOnceForAllItems + $input.all() map). Dedup confirmed functional.
- **Test data statement:** All tests used synthetic prospects only (`*.invalid` email domains).
  Three records written to Airtable Prospects table: Alice Test, Bob Sample, Carol Demo.
  Update these records to `outreach_status: test-complete` before activating outreach-agent.

**Credential mapping:**
| Scope name | n8n credential name | Type | ID |
|---|---|---|---|
| pa-airtable | Airtable (PAT) | airtableTokenApi | airtable_pat_01 |
| pa-apollo | pa-apollo-io | httpHeaderAuth | pa_apollo_01 |

**Key bugs fixed during build:**
1. Apollo free plan blocks `/v1/mixed_people/search` — replaced with mock Code node
2. Legacy `airtableApi` credential (deprecated Feb 2024) — switched to `airtableTokenApi` PAT
3. Loop Over Items stale static data — removed loop node entirely, n8n processes items natively
4. IF node array operator failure — replaced with `Dedup and Prepare` Code node + string comparison
5. `$('Loop Over Items')` reference after loop removal — updated to `$json` direct references
6. `Dedup and Prepare` processing only 1 item — fixed by using `runOnceForAllItems` + `$input.all()`

---

## [PA] Status Update Agent
Built: 2026-03-20
Build time: ~30 minutes
Status: Built (structural) — awaiting Anthropic credential and end-to-end test

**Workflow ID:** `VhqfzN6afzpNDTu1`
**n8n URL:** `http://localhost:5678/workflow/VhqfzN6afzpNDTu1`
**Active:** false — owner must create Anthropic credential and test before activating

**Workflow summary:**
Runs every Monday at 09:00. Fetches all Airtable client records where
`project_status = 'live'`, loops over them one at a time, pulls their ClickUp
task list, categorises tasks (completed/in-progress/blocked/upcoming), generates
a status email using Claude Sonnet 4.6, sends it to the client via SMTP, and
updates `last_status_update_sent_at` in Airtable.

**Nodes built (14 total):**
1. Schedule Trigger — every Monday 09:00
2. Manual Trigger — for owner-initiated test runs
3. Fetch Active Clients (httpRequest) — GET Airtable clients table, filter `project_status='live'`
4. Check Active Clients (if) — exits cleanly if no live clients
5. Exit - No Active Clients (noOp) — clean exit on false branch
6. Split Client Records (code) — flattens Airtable records array to individual items
7. Loop Over Clients (splitInBatches, batchSize=1) — processes one client per iteration
8. Get ClickUp Tasks (clickUp, continueErrorOutput) — getAll tasks from client's list
9. Error Skip (code) — on ClickUp error: logs, sets skip_reason, loops back (non-blocking)
10. Structure Task Data (code) — categorises tasks, spreads client fields
11. Generate Email via Claude (httpRequest) — POST to Anthropic API, model claude-sonnet-4-6
12. Extract Email Body (code) — pulls `content[0].text` from Claude response, merges client data
13. Send Status Email (emailSend) — sends to client_email via SMTP, reply-to owner
14. Update Airtable Record (httpRequest) — PATCH updates `last_status_update_sent_at`

**Test results:**
- Structural validation: all 14 nodes present, all connections valid
- End-to-end test: PENDING — blocked by missing Anthropic credential (see Owner Review Item 8)

**Credential mapping:**
| Scope name | n8n credential name | Type | ID |
|---|---|---|---|
| pa-airtable | Airtable (PAT) | airtableTokenApi | airtable_pat_01 |
| pa-clickup | ClickUp account | clickUpApi | Sb40bHDhf930ydIw |
| pa-smtp | SMTP account | smtp | Q7ahJEa5Tvt4iRHX |
| pa-anthropic | **PLACEHOLDER** — Header Auth account | httpHeaderAuth | oXIFSJkKihNX09h0 |

**Hardcoded values:**
- Airtable base ID: `appMLHig3CN7WW0iW`
- Airtable clients table ID: `tblfvqqyYukRJQYmQYgdBXXCYhRqJ`
- Owner email: `lightofkai777@gmail.com`

---

## Owner Review Items

The following items require owner action before this workflow can be activated:

1. **BLOCKER — Missing SMTP credential:** The `pa-smtp` credential does not exist in n8n.
   Node 17 (Send Onboarding Summary Email) has a placeholder credential ID
   (`SMTP_CREDENTIAL_PLACEHOLDER`). Create the SMTP credential in n8n, then update
   the workflow's Node 17 credential reference to the real credential ID.

2. **Required — n8n variables to set:** The workflow references n8n variables that
   must be created in n8n's Variables store before activation:
   - `PA_AIRTABLE_BASE_ID` — the Airtable base ID for the Phoenix Automation CRM
   - `PA_AIRTABLE_CLIENTS_TABLE_ID` — the table ID for the clients/leads table
   - `PA_CLICKUP_TEAM_ID` — the ClickUp team/workspace ID
   - `PA_CLICKUP_SPACE_ID` — the ClickUp space ID for the delivery space
   - `PA_OWNER_EMAIL` — owner email address for onboarding summary notifications

3. **Required — Airtable schema confirmation:** The workflow assumes the Airtable
   clients table has fields named: `email`, `lead_score_grade`, `industry`,
   `scope_of_work` (or `tools_required`), `project_status`, `client_slug`,
   `n8n_workspace_id`, `n8n_credentials_template_id`, `clickup_project_id`,
   `onboarding_started_at`. Confirm field names match before activating.

4. **Required — Scope of work tools field:** Node 9 reads a `scope_of_work` field
   from Airtable and parses markdown for a "Tools required" section, OR reads a
   `tools_required` field directly as a JSON array or comma-separated string.
   Confirm which format applies to your Airtable setup and verify parsing works
   with a test record.

5. **Required — Error workflow connection:** The `settings.errorWorkflow` field is
   currently empty string. Once the standard PA error-handling workflow exists,
   provide its ID and update this workflow's settings to connect it.

6. **Recommended — End-to-end test:** Run one full test with the test payload from
   the scope of work before activating:
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
   After test: delete the test n8n workspace project, delete the test ClickUp list,
   update the test Airtable record to `project_status: test-complete`.

7. **Verify — ClickUp operation type:** The scope says "Create List" — the workflow
   uses `resource: list, operation: create` with `folderless: true`. If your ClickUp
   structure uses Spaces or Folders as the top-level project container, adjust
   `resource` and `operation` accordingly.

---

## Owner Review Items — [PA] Lead Generation

8. **Required — Replace mock Apollo node:** The `Fetch ICP Prospects` node is a Code
   node returning 3 synthetic prospects. When a paid Apollo.io plan is available, replace
   it with an HTTP Request node: POST `https://api.apollo.io/v1/mixed_people/search`,
   credential `pa_apollo_01` (httpHeaderAuth). See scope file for full body payload.

9. **Required — Clean up test prospects:** Three synthetic records were written to the
   Airtable Prospects table during testing: Alice Test, Bob Sample, Carol Demo (all
   `*.invalid` email domains). Update these to `outreach_status: test-complete` before
   activating the outreach-agent so they are not sent real outreach emails.

---

## Owner Review Items — [PA] Status Update Agent

10. **BLOCKER — Missing Anthropic credential:** The `Generate Email via Claude` node
    (node ID `gen-email`) currently references `Header Auth account` (ID `oXIFSJkKihNX09h0`)
    as a placeholder. Create a new n8n credential:
    - Type: HTTP Header Auth
    - Name: `pa-anthropic` (or update the node to match whatever name you use)
    - Header Name: `x-api-key`
    - Header Value: your Anthropic API key
    Then update the `Generate Email via Claude` node's credential reference to the new ID.

11. **Required — Verify Airtable clients table schema:** The workflow reads these fields
    from the clients table (`tblfvqqyYukRJQYmQYgdBXXCYhRqJ`): `client_name`, `client_email`,
    `clickup_project_id`, `client_slug`, `client_timezone`. Confirm these field names exist.
    The PATCH update writes to: `last_status_update_sent_at`. Confirm this field exists or
    create it as a Date/Time field.

12. **Required — Test with real client record before activating:** Set one Airtable record
    to `project_status = 'live'` with a valid `clickup_project_id`. Set the `client_email`
    to your own email for testing. Run via Manual Trigger. Confirm:
    - ClickUp tasks are fetched for the test project
    - Claude generates a coherent status email
    - Email arrives in your inbox
    - Airtable `last_status_update_sent_at` is updated
    After test: reset `project_status` back to previous value.
