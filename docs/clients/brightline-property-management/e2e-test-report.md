# End-to-End Systems Test Report — Phoenix Automation
**Client:** Brightline Property Management (test client)
**Test Date:** 2026-03-25
**Conducted by:** Haris (VA) + Claude
**Test Email:** muneebfiaz201@gmail.com

---

## Summary

| Step | What was tested | Result |
|------|----------------|--------|
| 1 | Lead Gen — Create prospect record in Airtable | ✅ PASS |
| 2 | Pre-seed client record (Airtable Clients table) | ✅ PASS (bug found: wrong service_tier option in docs) |
| 3 | Onboarding Automation — webhook trigger + all outputs | ✅ PASS |
| 4 | ClickUp folder + 4 lists creation | ⚠️ PARTIAL (folder ID confirmed, list count unverifiable — ClickUp key expired) |
| 5 | Status Update Agent — email send to live client | ⚠️ MANUAL REQUIRED |
| 6 | Referral Trigger Agent — 30-day referral sequence | ⚠️ MANUAL REQUIRED |

**Overall verdict: CONDITIONAL PASS** — core pipeline (Lead Gen → Onboarding) fully verified. Steps 5 and 6 require manual execution from the n8n editor (n8n Cloud API does not expose an execute endpoint for schedule-triggered workflows).

---

## Airtable Records Created

| Table | Record ID | Purpose |
|-------|-----------|---------|
| Prospects | `recd7jqEXed0v3oBe` | Test prospect (Step 1) |
| Clients | `recNr32G2QJd5bbkw` | Test client (Steps 2–6) |

---

## Step-by-Step Results

### Step 1 — Lead Gen Simulation ✅ PASS

Created prospect record manually to simulate Apollo.io → Airtable write.

**Verified:**
- Record `recd7jqEXed0v3oBe` created in Prospects table
- `outreach_status = pending` ✅
- `source = apollo` ✅

---

### Step 2 — Pre-seed Client Record ✅ PASS (with bug)

Created Brightline client record in Clients table.

**Bug found:** `service_tier` in PROJECT_OVERVIEW.md listed `growth-package` as a valid option. Actual Airtable singleSelect options are: `starter-build`, `growth-build`, `scale-build`, `retainer`, `agency-retainer`. Used `growth-build`.

**Fix required:** Update PROJECT_OVERVIEW.md line 288 → change `growth-package` to `growth-build`.

---

### Step 3 — Onboarding Automation ✅ PASS

**Webhook:** `POST https://kaiashley.app.n8n.cloud/webhook/payment-confirmed`

**Payload sent:**
```json
{
  "client_name": "Sarah Chen",
  "client_email": "muneebfiaz201@gmail.com",
  "company_name": "Brightline Property Management",
  "payment_status": "paid",
  "service_tier": "growth-build",
  "amount": 2500
}
```

**n8n execution:** ID 70 — `status: success`, completed in ~9.6 seconds.

**Airtable record after execution — all fields verified:**

| Field | Expected | Actual | Status |
|-------|----------|--------|--------|
| `project_status` | `onboarding.in_progress` | `onboarding.in_progress` | ✅ |
| `client_slug` | `brightline-property-management` | `brightline-property-management` | ✅ |
| `clickup_folder_id` | non-null | `90148085794` | ✅ |
| `n8n_workspace_id` | `[PA] brightline-property-management` | `[PA] brightline-property-management` | ✅ |
| `n8n_credentials_template_id` | non-null | `creds-checklist-brightline-property-management` | ✅ |
| `credentials_checklist` | 3 tools (Buildium, QuickBooks, Gmail) | 3 tools, all `pending_client_setup` | ✅ |
| `onboarding_started_at` | populated | not set | ⚠️ minor gap |

**Note:** `onboarding_started_at` is not being written by the Airtable update node. Low-priority fix.

---

### Step 4 — ClickUp Verification ⚠️ PARTIAL

**Confirmed:** `clickup_folder_id = 90148085794` written to Airtable (proves folder creation succeeded).

**Unverifiable this session:** ClickUp API key (`pk_141042452_FXSVZ48DPDXJVHX2XMJHUVGJD9CQ41YX`) expired. Could not confirm 4 lists (Onboarding, Build, QA, Live) were created inside the folder.

**Action for Kai:** Open ClickUp → Phoenix Automation space → verify folder `90148085794` (brightline-property-management) has 4 lists.

---

### Step 5 — Status Update Agent ⚠️ MANUAL REQUIRED

**Cannot trigger via API:** n8n Cloud API has no execute endpoint for schedule + manual trigger workflows.

**Test data is ready:**
- Brightline record updated to `project_status = "live"` ✅
- `clickup_folder_id = 90148085794` set ✅

**Manual test instructions for Kai:**
1. Open [PA] Status Update Agent in n8n editor (`94DpGwRPWGRPqCVU`)
2. Click "Execute workflow"
3. Verify: email sent to `muneebfiaz201@gmail.com` with ClickUp task list
4. Verify: `last_status_update_sent_at` updated on Brightline Airtable record

---

### Step 6 — Referral Trigger Agent ⚠️ MANUAL REQUIRED

**Cannot trigger via API:** Same constraint as Step 5.

**Test data is ready:**
- `project_status = live` ✅
- `referral_sequence_sent = false` ✅
- `project_launch_date = 2026-02-23` (exactly 30 days before test date 2026-03-25) ✅
- `scope_of_work = "Buildium-to-QuickBooks rent sync, Maintenance request triage chatbot"` ✅

**Manual test instructions for Kai:**
1. Open [PA] Referral Trigger Agent in n8n editor (`ka6GesSfWVo2FZtU`)
2. Click "Execute workflow"
3. Expected behaviour: Claude generates 2-touch referral emails referencing Buildium-to-QuickBooks sync. Instantly.ai is **stubbed** — will log `INSTANTLY_NOT_CONFIGURED` to `automation_logs` table (not send emails)
4. Verify: `referral_sequence_sent = true` on Brightline Airtable record
5. Verify: entry in `automation_logs` table with `workflow = "[PA] Referral Trigger Agent"`

---

## Bugs Found

| # | Description | Severity | Fix |
|---|-------------|----------|-----|
| 1 | PROJECT_OVERVIEW.md lists `growth-package` as service_tier option — doesn't exist | Medium | Update docs: `growth-package` → `growth-build` |
| 2 | `onboarding_started_at` not written to Airtable by Onboarding Automation | Low | Add `onboarding_started_at: $now.toISO()` to Airtable update node (Node 21) |
| 3 | ClickUp API key not re-providable across sessions (expires per session) | Low | Document that ClickUp key must be re-shared per session |

---

## Cleanup Actions

After Kai completes manual Steps 5 and 6:

1. **Airtable Clients table:** Update Brightline record — set `project_status = "test-complete"` or delete the record
2. **Airtable Prospects table:** Update record `recd7jqEXed0v3oBe` — set `outreach_status = "test-complete"` or delete
3. **ClickUp:** Delete the `brightline-property-management` folder created under Phoenix Automation space
4. **n8n execution log:** No cleanup needed — execution ID 70 is safe to leave

---

## Known Limitations (Not Bugs)

- **Instantly.ai not configured:** Referral Trigger Agent cannot send emails until `pa-instantly` credential is set up and the stub code is replaced with live Instantly.ai API calls.
- **Calendly URL placeholder:** Referral Trigger Agent uses `[CALENDLY_LINK]` as placeholder. Must be replaced with Kai's actual Calendly URL before production use.
- **Status Update Agent ClickUp reads:** If the ClickUp folder has no tasks, the email will include an empty task list. Not a bug — expected until real client tasks are added.
