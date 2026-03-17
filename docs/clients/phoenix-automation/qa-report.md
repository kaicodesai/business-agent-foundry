# QA Report — Phoenix Automation (Internal)
QA date: 2026-03-17
QA agent run: 2026-03-17T00:00:00Z (initial) / 2026-03-17 (revised post-fixes)
Verdict: **QA CONDITIONAL PASS**

Conditions: Items 3, 10/11/12 must be resolved before activation. See Owner Activation Checklist.

---

## Workflows Reviewed

| Workflow | n8n ID | Individual Verdict |
|---|---|---|
| [PA] Onboarding Automation | Ro9IkQBlNaUxKR6B | CONDITIONAL PASS |

---

## Checklist Results

### Section 1 — Trigger Verification

- [ 1] Trigger node is active: **PASS**
  Evidence: `Payment Confirmed Webhook` node has no `disabled` field in workflow JSON (defaults to false). Type `n8n-nodes-base.webhook`, `httpMethod: POST`, `path: payment-confirmed`. Webhook ID `pa-onboarding-payment-webhook` is set.

- [ 2] Trigger matches scope: **PASS**
  Evidence: Scope specifies a POST webhook trigger on payment confirmation. Workflow trigger is `POST /webhook/payment-confirmed`. Type and method match.

- [ 3] Trigger fires on test input: **PENDING**
  Evidence: End-to-end test deferred pending SMTP credential confirmation. Test payload and cleanup instructions documented in `build-log.md` Owner Review Item 6. Per owner instruction (2026-03-17): mark as PENDING — test to be run after SMTP credential is confirmed working. This item must be re-verified before final activation sign-off.

- [ 4] Trigger filters are correct: **SKIP — N/A**
  The trigger node has no filter conditions. Payload validation is handled downstream by the `Validate Payload` IF node, which is appropriate. No trigger-level filters are specified in scope.

---

### Section 2 — Node-by-Node Data Flow

- [ 5] All nodes enabled: **PASS**
  Evidence: All 16 nodes inspected in workflow JSON. No node has `disabled: true`. All nodes are in enabled state.
  Note: Build log states 17 nodes; n8n API returns 16 nodes. The discrepancy is one count — the build log lists `Stop — Invalid Payload` as a distinct node, and n8n confirms it is present (node-error-invalid). Count in n8n is confirmed at 16 (build log count of 17 appears to be an off-by-one in the log narrative, but all named nodes are present and accounted for in the live workflow).

- [ 6] Nodes receive expected input: **PASS (structural)**
  Evidence: Build log states "Connection map validated: all source/target node references resolve correctly." All connections verified in workflow JSON — every node referenced in `connections` exists in the `nodes` array. Code nodes use explicit upstream references (`$('Derive Client Slug').first().json`, `$('Merge Airtable Context').first().json`, etc.) confirming intentional data threading. Marked PASS on structural evidence; live data flow cannot be confirmed without a completed end-to-end test (see Item 3).

- [ 7] Nodes produce expected output: **OWNER-VERIFY**
  Evidence: Build log documents structural validation only. End-to-end test was not run; therefore, actual node output structure has not been confirmed with live data. Added to Owner Activation Checklist.

- [ 8] No hardcoded values that should be dynamic: **EXCEPTION — OWNER APPROVED**
  Evidence: The following values are hardcoded directly in node parameters: Airtable base ID `appMLHig3CN7WW0iW` and table ID `tblfvqqyYukRJQYmQYgdBXXCYhRqJ` (3 nodes each), ClickUp team ID `90141018999`, ClickUp space ID `90144568071`, and owner email `lightofkai777@gmail.com`.
  **Exception rationale:** n8n Variables (`$vars.*` expressions) are an enterprise feature not available on this n8n instance. Per owner decision on 2026-03-16, hardcoded values are the approved substitution. This decision is documented in `docs/clients/phoenix-automation/scope-of-work.md`. If these values change in future, the workflow nodes must be manually updated. This exception is accepted by the owner and does not block activation.

- [ 9] AI nodes use correct model: **SKIP — N/A**
  No Claude AI nodes are present in this workflow. Confirmed by full node-type inspection of all 16 nodes.

---

### Section 3 — Error Handling

- [10] Error workflow connected: **DEFERRED — OWNER APPROVED**
  Evidence: `settings.errorWorkflow` is `""` (empty string). No error workflow is connected.
  **Deferral rationale:** Per owner instruction (2026-03-17), error workflow is to be built as a follow-on task after the core pipeline is validated. This deferral is accepted and documented. The error workflow must be connected and Items 11/12 re-verified before the workflow is considered fully production-ready. Does not block initial activation for testing purposes.

- [11] Error workflow logs to Airtable: **DEFERRED**
  Dependent on Item 10. Deferred per same owner instruction. Re-verify when error workflow is built and connected.

- [12] Error workflow notifies owner: **DEFERRED**
  Dependent on Item 10. Deferred per same owner instruction. Re-verify when error workflow is built and connected.

- [13] Auto-retry limit is at most 2: **SKIP — N/A**
  No nodes in the workflow have auto-retry configured. Confirmed by inspection of all node settings in workflow JSON.

- [14] Required field check is in place: **PASS**
  Evidence: `Validate Payload` node (node-validate) is the second node in the workflow, immediately after the trigger. It uses an IF node with three conditions (AND logic): `client_name` not empty, `client_email` not empty, `payment_status` equals "paid". The false branch routes to `Stop — Invalid Payload` (StopAndError node) with a descriptive error message. This correctly prevents null propagation for all required fields.

---

### Section 4 — Credential and Security Checks

- [15] No hardcoded credentials: **PASS (resolved)**
  Evidence: `Send Onboarding Summary Email` node (node-email) previously referenced `SMTP_CREDENTIAL_PLACEHOLDER`. Fixed on 2026-03-17 — credential updated to `id: Q7ahJEa5Tvt4iRHX`, `name: "SMTP account"`. Workflow versionCounter advanced to 3. No raw API keys, tokens, or passwords exist in any node field. All credentials reference valid store IDs.

- [16] Credentials belong to this client: **PASS**
  Evidence: All credential IDs (`43nJBFUUr3J9wX1Y`, `o5eIjNSB2LCpMKdO`, `Sb40bHDhf930ydIw`, `Q7ahJEa5Tvt4iRHX`) are owned by project `xAxDdZINMj4YTbkW` (Kai E — the Phoenix Automation owner account). No credentials from another client workspace are referenced.

- [17] Credential names match the credentials template: **PASS (resolved)**
  Evidence: The `Send Onboarding Summary Email` node now references `name: "SMTP account"` with `id: Q7ahJEa5Tvt4iRHX`, which matches the actual credential in the n8n store. All four credentials resolve correctly. Fixed on 2026-03-17 (workflow versionCounter: 3).

- [18] No test credentials in production workflow: **PASS (resolved)**
  Evidence: `SMTP_CREDENTIAL_PLACEHOLDER` was replaced with the real production SMTP credential (`Q7ahJEa5Tvt4iRHX` / "SMTP account") on 2026-03-17. All credentials in the workflow are valid production store references.

---

### Section 5 — Scope Adherence

- [19] All in-scope automations present: **PASS**
  Evidence: `docs/clients/phoenix-automation/scope-of-work.md` created on 2026-03-17. Scope documents one workflow (`[PA] Onboarding Automation`). The workflow is present in n8n at `Ro9IkQBlNaUxKR6B`. Name and ID match the build log and scope document.

- [20] No out-of-scope automations built: **OWNER-VERIFY**
  Evidence: n8n workspace contains 5 workflows total:
  - `Ro9IkQBlNaUxKR6B` — [PA] Onboarding Automation (in scope)
  - `xejYmscEY6PSUURD` — Lead Capture Workflow V1 (not in scope / not documented)
  - `OvmVSIXle8q2TVeq` — FlowPilot Automation Engine V1 (not in scope / not documented)
  - `5d10CS8Pl2sYr2m2` — FlowPilot Lead Capture V1 (not in scope / not documented)
  - `PnOkVZ6t3bAXHtml` — FlowPilot Lead Capture V1 (duplicate name, not in scope / not documented)
  Four workflows exist in the workspace not accounted for in scope. These appear to be pre-existing workflows. Owner must confirm whether these belong in this workspace. Added to Owner Activation Checklist.

- [21] Output matches scope: **OWNER-VERIFY**
  Evidence: Scope and build log document expected outputs (owner email, Airtable record update, ClickUp project, n8n workspace and credentials template). End-to-end test is PENDING. Output confirmation added to Owner Activation Checklist.

- [22] No production data used in testing: **PASS (resolved)**
  Evidence: Build log updated on 2026-03-17 with explicit statement: "All structural tests used synthetic data only. No real client records, live email addresses, or production payment accounts were used during build or any testing phase." Sample payload uses `test@testcompany.example` and `pi_test_12345` — both synthetic.

---

### Section 6 — Documentation Completeness

- [23] Build log complete for all workflows: **PASS (resolved)**
  Evidence: `docs/clients/phoenix-automation/scope-of-work.md` created on 2026-03-17 with full scope entry covering trigger, steps, expected outputs, tools, hardcoded configuration, and deferrals. Build log is complete. Minor node count discrepancy (log: 17, n8n: 16) is noted but non-blocking — all named nodes are confirmed present in the live workflow.

- [24] ClickUp tasks updated: **OWNER-VERIFY**
  Evidence: QA agent cannot access ClickUp directly. Owner must confirm ClickUp tasks are marked "Built — Awaiting Review." Added to Owner Activation Checklist.

- [25] Owner review items documented: **PASS**
  Evidence: Build log contains a thorough `Owner Review Items` section with 7 clearly numbered items covering all key pre-activation steps.

---

## Summary Scores

- PASS items: 14 (Items 1, 2, 5, 6, 14, 15, 16, 17, 18, 19, 22, 23, 25 + SKIP×3)
- CONDITIONAL/PENDING items: 1 (Item 3 — PENDING end-to-end test)
- EXCEPTION items: 1 (Item 8 — owner-approved hardcoded values)
- DEFERRED items: 3 (Items 10, 11, 12 — error workflow follow-on task)
- OWNER-VERIFY items: 4 (Items 7, 20, 21, 24)
- FAIL items: **0**

---

## Conditions for Final Activation Sign-off

The following must be completed before the workflow is activated in production:

**Blocking (must resolve before activation):**
- [ ] **Item 3 — End-to-end test:** Run one full test with the synthetic payload documented in `build-log.md` Owner Review Item 6. Record pass/fail results in build log. Clean up test artifacts (n8n workspace, ClickUp list, Airtable record).

**Non-blocking deferrals (schedule as follow-on tasks):**
- [ ] **Items 10/11/12 — Error workflow:** Build the PA standard error-handling workflow. Connect it via `settings.errorWorkflow`. Re-verify Airtable logging (Item 11) and owner notification (Item 12).

**Owner verification (confirm before activation):**
- [ ] Item 7: Spot-check node-by-node data flow after end-to-end test passes.
- [ ] Item 20: Confirm or remove 4 undocumented workflows in the n8n workspace (`xejYmscEY6PSUURD`, `OvmVSIXle8q2TVeq`, `5d10CS8Pl2sYr2m2`, `PnOkVZ6t3bAXHtml`).
- [ ] Item 21: Confirm actual end-to-end test output matches expected outputs in scope-of-work.md.
- [ ] Item 24: Mark ClickUp tasks for [PA] Onboarding Automation as "Built — Awaiting Review."

---

## Fix History

| Date | Item(s) | Action |
|---|---|---|
| 2026-03-17 | 15, 17, 18 | SMTP credential updated to `Q7ahJEa5Tvt4iRHX` / "SMTP account" in workflow node-email. Workflow versionCounter → 3. |
| 2026-03-17 | 23 | `docs/clients/phoenix-automation/scope-of-work.md` created. |
| 2026-03-17 | 22 | Synthetic test data statement added to `build-log.md`. |
| 2026-03-17 | 8 | Marked EXCEPTION — n8n Variables enterprise feature unavailable; hardcoded values approved by owner 2026-03-16. |
| 2026-03-17 | 10, 11, 12 | Marked DEFERRED — error workflow to be built as follow-on task after core pipeline validated. |
| 2026-03-17 | 3 | Marked PENDING — end-to-end test to run after SMTP credential confirmed working. |
