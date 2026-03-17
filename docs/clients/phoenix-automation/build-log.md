# Build Log — Phoenix Automation (Internal)

---

## [PA] Onboarding Automation
Built: 2026-03-16
Build time: ~25 minutes
Status: Built and tested (structural) — awaiting owner review

**Workflow ID:** `Ro9IkQBlNaUxKR6B`
**n8n URL:** `http://localhost:5678/workflow/Ro9IkQBlNaUxKR6B`
**Active:** false — owner must activate after review

**Workflow summary:**
Triggered by a POST webhook at `/webhook/payment-confirmed` when a Stripe (or
equivalent) payment is confirmed. Validates the payload, derives a client slug,
looks up the client in Airtable, creates a new n8n project workspace, reads
the scope-of-work tools list from Airtable, creates a credentials template
workflow in the client's workspace, creates a ClickUp project, updates the
Airtable client record with all generated IDs, and emails the owner a
full onboarding summary.

**Nodes built (17 total):**
1. Payment Confirmed Webhook (n8n-nodes-base.webhook) — POST /webhook/payment-confirmed
2. Validate Payload (n8n-nodes-base.if) — checks client_name, client_email, payment_status=paid
3. Stop — Invalid Payload (n8n-nodes-base.stopAndError) — false branch of validation
4. Derive Client Slug (n8n-nodes-base.code) — generates slug from client_name
5. Airtable — Lookup Client (n8n-nodes-base.airtable) — search by email
6. Merge Airtable Context (n8n-nodes-base.code) — merges lead_score_grade, industry, airtable_record_id
7. Create n8n Workspace (n8n-nodes-base.httpRequest) — POST /api/v1/projects
8. Extract Workspace ID (n8n-nodes-base.code) — validates and extracts workspace_id, hard-fails if missing
9. Read Scope of Work (n8n-nodes-base.airtable) — reads scope_of_work field for tools list
10. Extract Tools Required (n8n-nodes-base.code) — parses tools_required from scope_of_work markdown or JSON array field
11. Create Credentials Template (n8n-nodes-base.httpRequest) — POST /api/v1/workflows, creates placeholder nodes per tool
12. Extract Template ID (n8n-nodes-base.code) — validates and extracts credentials_template_id
13. Create ClickUp Project (n8n-nodes-base.clickUp) — creates list, non-blocking on error (continueErrorOutput)
14. Merge ClickUp ID — Success (n8n-nodes-base.code) — extracts clickup_project_id from success path
15. Log ClickUp Error — Continue (n8n-nodes-base.code) — logs error, sets clickup_project_id=null, continues
16. Update Airtable Record (n8n-nodes-base.airtable) — updates project_status, all IDs, onboarding_started_at
17. Send Onboarding Summary Email (n8n-nodes-base.emailSend) — plain text summary to owner

**Test results:**
- Individual node tests: PASS (structural validation — all 17 nodes present, all connections valid, no missing required fields)
- Connection map validated: all source/target node references resolve correctly
- End-to-end test: NOT RUN — requires live Airtable base IDs, ClickUp space ID, and SMTP credential before full run
- Error handling: Partial — payload validation failure routes to StopAndError; ClickUp failure is non-blocking with error output routing; workspace and credentials template failures throw hard errors; n8n error workflow trigger not yet connected (requires existing error workflow ID)

**Credential mapping:**
| Scope name | n8n credential name | Type | ID |
|---|---|---|---|
| pa-airtable | Airtable account | airtableApi | 43nJBFUUr3J9wX1Y |
| pa-n8n-api | n8n account | n8nApi / httpHeaderAuth | o5eIjNSB2LCpMKdO |
| pa-clickup | ClickUp account | clickUpApi | Sb40bHDhf930ydIw |
| pa-smtp | pa-smtp | smtp | **MISSING — placeholder in workflow** |

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
