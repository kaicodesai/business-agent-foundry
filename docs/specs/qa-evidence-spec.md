# QA Evidence Specification
Version: 1.0
Last updated: 2026-03-15

Defines, for each of the 25 QA checklist items, what evidence is required,
who can verify it, and what the qa-agent must do when it cannot directly
confirm a result.

Cross-references:
- QA checklist definition → `.claude/agents/qa-agent.md`
- QA verdict rules → `docs/specs/decision-logic-spec.md` DL-9
- Build log format → `.claude/agents/workflow-builder-agent.md`

---

## Why This Spec Exists

The qa-agent.md defines 25 checklist items and three verdicts. What was
missing is clarity on what constitutes sufficient evidence for each item.
The existing checklist mixes:

- Items verifiable by reading a file
- Items requiring a live n8n API call
- Items requiring human judgment about correctness
- Items that depend on client-side context the agent cannot access

Without this distinction, the qa-agent either over-claims (marking PASS
on items it cannot truly verify) or under-delivers (failing items that
the builder correctly handled but didn't document in an agent-readable way).

---

## Evidence Categories

| Tag | Meaning |
|-----|---------|
| `[FILE]` | Agent reads a file and checks for presence or content pattern |
| `[API]` | Agent calls the n8n API and checks live workflow state |
| `[OWNER]` | Requires human review — agent cannot determine correctness, owner must confirm |
| `[INFER]` | Agent infers from build log documentation — strong indicator but not direct verification |

When an item is `[OWNER]`, qa-agent does not mark PASS or FAIL. It marks
`OWNER-VERIFY` and adds the item to the Owner Activation Checklist at the
bottom of the qa-report.md.

---

## Evidence Requirements — Section 1: Trigger Verification

### Item 1 — Trigger node is active

**Claim to verify:** Trigger node is enabled and configured to fire on the
correct event.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Workflow JSON shows trigger node `disabled: false` | `[API]` | Read workflow via n8n API — check trigger node `disabled` field |
| Trigger node type matches scope-of-work.md `Trigger:` field | `[API]` + `[FILE]` | Compare n8n node type string against scope trigger description |

**If n8n API is unavailable:** Mark `SKIP — n8n API not accessible`. This
is an **unacceptable SKIP** — QA is blocked until API access is restored.

---

### Item 2 — Trigger matches scope

**Claim to verify:** Trigger event is the one specified in scope-of-work.md.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Trigger event name in n8n matches the scope `Trigger:` field exactly | `[API]` + `[FILE]` | Read scope trigger value, compare to n8n trigger event setting |
| Any trigger filter conditions match scope | `[API]` + `[FILE]` | If scope specifies conditions (e.g. "only orders > $100"), these must appear in the trigger filter configuration |

**If scope has ambiguous trigger description:** Mark `OWNER-VERIFY` and
add to Owner Activation Checklist: "Confirm trigger event [n8n setting]
matches your intended trigger [scope description]."

---

### Item 3 — Trigger fires on test input

**Claim to verify:** Trigger executes successfully with representative data.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Build log entry includes "End-to-end test: PASS" | `[FILE]` | Read build-log.md for this workflow |
| Build log documents what test input was used | `[FILE]` | Test input must be described — not blank |

**If build log shows end-to-end test passed but does not describe test data:**
Mark `FAIL` — insufficient evidence. Builder must update build log with
test data description.

**If QA wants to independently confirm:** Re-execute the trigger with the
same test data the builder used. Do not use production data.

**Cannot SKIP this item.** If the trigger cannot be tested, mark `QA BLOCKED`.

---

### Item 4 — Trigger does not fire on irrelevant events

**Claim to verify:** Trigger filters exclude events that should not trigger
the workflow.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| If no filters in scope: mark N/A | `[FILE]` | Scope-of-work.md has no filter requirements |
| If filters in scope: filter conditions are set in n8n trigger node | `[API]` | Read trigger node filter configuration, verify it matches scope |

---

## Evidence Requirements — Section 2: Node-by-Node Data Flow

### Item 5 — All nodes enabled

**Claim to verify:** No node is in disabled state.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| n8n workflow JSON: every node has `disabled: false` or no `disabled` key | `[API]` | Iterate all nodes in workflow JSON, check disabled state |

**Exception:** If build log explicitly documents a node as intentionally
disabled in production (with reason), mark PASS with note.

---

### Item 6 — Nodes receive expected input

**Claim to verify:** Each node's required input fields are present from
the previous node's output.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Build log documents individual node test results as PASS | `[FILE]` | Each node entry in build log must show PASS status |
| Build log documents data flow (what data passes between nodes) | `[INFER]` | If node test results show correct data passing through, infer input is correct |

**If build log is incomplete (missing node test results):** Mark `FAIL` —
incomplete documentation. This is a documentation failure, not a workflow
failure — but the checklist cannot be completed without it.

---

### Item 7 — Nodes produce expected output

**Claim to verify:** Each node's output data structure is what the next
node expects.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Build log node test results show expected output for each node | `[INFER]` | Build log must describe what each node produced in testing |

**If unable to infer from build log alone:** Mark `OWNER-VERIFY` and add
to Owner Activation Checklist: "Spot-check [workflow name] in n8n — run
a test execution and confirm each node passes expected data to the next."

---

### Item 8 — No hardcoded values that should be dynamic

**Claim to verify:** Dates, IDs, emails, and record names come from
upstream data, not hardcoded strings.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Scan all node field values in n8n workflow JSON for patterns that suggest hardcoded dynamic data (specific email addresses, specific dates, specific record IDs) | `[API]` | Read all node parameter values from n8n API; flag any that look like specific user emails, live record IDs, or date strings |

**If a hardcoded value is present and the scope explicitly defines it as
fixed (e.g. "always send to owner@company.com"):** Mark PASS with note
documenting the scope reference.

---

### Item 9 — AI nodes use the correct model

**Claim to verify:** Claude AI nodes use haiku-4-5 for classification,
sonnet-4-6 for drafting/generation.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| If no AI nodes in workflow: mark N/A | `[API]` | Check workflow for Claude AI node type |
| If AI nodes present: read model parameter from each AI node in n8n | `[API]` | Model parameter must be `claude-haiku-4-5` for classification, `claude-sonnet-4-6` for generation |

---

## Evidence Requirements — Section 3: Error Handling

### Item 10 — Error workflow is connected

**Claim to verify:** Workflow has an error trigger connected to a Phoenix
Automation error-handling workflow.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Workflow settings in n8n show `errorWorkflow` field set | `[API]` | Read workflow settings via n8n API — `errorWorkflow` must be populated |
| Build log records "Error handling: Configured" | `[FILE]` | Build log entry for this workflow must state error handling status |

**If build log says "Not configured — reason: [X]":** Mark `FAIL` unless
scope explicitly excludes error handling (no scope should exclude this).

**Cannot SKIP this item.** No workflow ships without error handling.

---

### Item 11 — Error workflow logs to Airtable

**Claim to verify:** The connected error workflow logs workflow name,
error message, and timestamp to the client's Airtable record.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Error workflow has an Airtable node that creates/updates a record | `[API]` | Read the connected error workflow's nodes via n8n API |
| Airtable node maps: workflow name, error message, timestamp | `[API]` | Check field mappings in the Airtable node |

**If this is a shared Phoenix Automation error workflow template:** Verify
the template version is the current one and handles these three fields.

---

### Item 12 — Error workflow notifies the owner

**Claim to verify:** Error workflow sends an alert (email or Slack) to
the owner on failure.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Error workflow has an email or Slack node that targets the owner | `[API]` | Read error workflow nodes — confirm destination is owner contact, not client |

---

### Item 13 — Auto-retry limit is set

**Claim to verify:** Any nodes with auto-retry have a maximum of 2 retries.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| If no nodes have auto-retry configured: mark N/A | `[API]` | Check node retry settings in workflow JSON |
| If retry is configured: retry count ≤ 2 on all nodes | `[API]` | Read `maxTries` or equivalent from each node |

---

### Item 14 — Required field check is in place

**Claim to verify:** Workflow handles missing required input fields
gracefully (stops and logs, does not propagate null values).

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Build log documents how missing fields are handled | `[INFER]` | Builder should have noted IF node or validation node in build plan |
| Workflow contains an IF node or validation check near the trigger | `[API]` | Inspect first few nodes for validation logic |

**If no validation logic is present and scope requires it:** Mark `FAIL`.
If scope inputs are always guaranteed complete (e.g. n8n trigger captures
all required fields automatically), mark PASS with note explaining why
validation is not needed.

---

## Evidence Requirements — Section 4: Credential and Security Checks

These four items cannot be skipped. Any FAIL on items 15, 16, or 17
triggers immediate QA FAIL.

### Item 15 — No hardcoded credentials

**Claim to verify:** Zero raw API keys, tokens, passwords, or webhook
secrets are hardcoded in any node field.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Scan all node parameter values in workflow JSON for patterns matching API key formats (long alphanumeric strings, Bearer tokens, begins with `sk-`, `xoxb-`, `AIza`, etc.) | `[API]` | Read all node parameters via n8n API; apply pattern scan |
| Every credential reference uses the n8n credential store (references credential by name, not by value) | `[API]` | Check that credential fields reference a named credential, not a raw string |

**If any match is found:** Immediate QA FAIL. Do not proceed. Return to
workflow-builder-agent with exact node name and field where the hardcoded
value was found.

---

### Item 16 — Credentials belong to this client

**Claim to verify:** Every credential referenced in this workflow belongs
to this client's workspace, not another client's.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| All credential names referenced in the workflow match names that exist in the client's credentials template | `[API]` + `[FILE]` | Read credentials template node names from n8n; compare against all credential references in this workflow |
| No credential name contains another client's company name or slug | `[API]` | Pattern check on credential reference names |

**If a credential reference does not resolve to the client's workspace:**
Immediate QA FAIL with exact node and credential reference name.

---

### Item 17 — Credential names match the credentials template

**Claim to verify:** Every credential reference in the workflow resolves
to a named entry in the client's credentials template workflow.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| List of credential names used in the workflow (from n8n API) is a subset of credential names in the `[client-slug]-credentials-template` workflow | `[API]` | Read both lists; every workflow credential must appear in template |

**If a credential reference is not in the template:** QA FAIL — the
credential reference will not resolve in production.

---

### Item 18 — No test credentials in production workflow

**Claim to verify:** Any test credential used during the build has been
replaced with the production credential.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Build log does not mention "test credential" or "sandbox key" as still in use at build completion | `[FILE]` | Read build log — if test credential was mentioned, confirm it was replaced |
| Credential names in workflow do not contain "test", "dev", "sandbox", or "staging" | `[API]` | String check on credential reference names |

**If build log mentions a test credential that was not explicitly replaced:**
Mark `FAIL`. Builder must confirm replacement.

---

## Evidence Requirements — Section 5: Scope Adherence

### Item 19 — All automations in scope are present

**Claim to verify:** Every automation listed in scope-of-work.md has a
workflow in n8n and an entry in build-log.md.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Count of automations in scope-of-work.md equals count of entries in build-log.md | `[FILE]` | Read both files, count and compare automation entries |
| Each automation name in scope matches a workflow name in n8n | `[API]` + `[FILE]` | List workflows in client n8n workspace; compare against scope automation names |

---

### Item 20 — No out-of-scope automations were built

**Claim to verify:** No extra workflows exist in the client's n8n workspace
that are not in scope-of-work.md.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Count of workflows in client n8n workspace equals count of automations in scope plus the credentials template | `[API]` + `[FILE]` | List all workflows in client workspace; expected count = scope automations + 1 (credentials template) |

**If extra workflows exist:** Identify them. If they are legitimate
(e.g. a test workflow from the build process), builder must document
them in the build log or remove them. Mark `OWNER-VERIFY` with the
extra workflow names listed.

---

### Item 21 — Output matches scope

**Claim to verify:** The final output of each workflow matches the
`Output:` field in scope-of-work.md.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Build log documents the end-to-end test output for each workflow | `[INFER]` | Build log must describe what was produced in the end-to-end test |
| End-to-end test output matches the scope `Output:` description | `[INFER]` | Compare build log test output description to scope output description |

**If the build log end-to-end test output is not described:** Mark `FAIL`
— documentation is insufficient. If described but output appears to
diverge from scope: Mark `OWNER-VERIFY` — owner must confirm the actual
output is acceptable.

---

### Item 22 — No production data was used in testing

**Claim to verify:** All tests used synthetic or representative data,
not real client customer records, live emails, or live financial data.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Build log explicitly states test data was synthetic/representative | `[FILE]` | Build log must include a statement about test data type |
| Build log does not mention specific real customer names, email addresses, or transaction IDs in test results | `[FILE]` | Review build log for real-data indicators |

**If build log does not address test data:** Mark `FAIL` — documentation
is insufficient. Builder must add a statement confirming test data type.

**If real data was used:** Immediate QA FAIL. Return to builder with
instruction to purge any test records created in production systems and
re-run tests with synthetic data.

---

## Evidence Requirements — Section 6: Documentation Completeness

### Item 23 — Build log entry exists for each workflow

**Claim to verify:** build-log.md has a complete entry for every workflow
in scope.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| build-log.md exists | `[FILE]` | File system check |
| build-log.md has a section header for each automation in scope-of-work.md | `[FILE]` | Count headers; compare against scope automation names |
| Each entry contains: build date, build time, status, workflow summary, nodes built, test results, error handling status, owner review items | `[FILE]` | Parse each entry for required fields |

**Missing fields per entry:** Mark `FAIL` for item 23. Builder must
complete the documentation.

---

### Item 24 — ClickUp task is marked "Built — Awaiting Review"

**Claim to verify:** ClickUp tasks for each workflow are updated.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Build log states ClickUp was updated, or owner confirms ClickUp status | `[INFER]` / `[OWNER]` | QA agent cannot access ClickUp directly — check build log for mention, or mark `OWNER-VERIFY` |

**Default behaviour:** Mark `OWNER-VERIFY` and add to Owner Activation
Checklist: "Confirm ClickUp tasks are marked 'Built — Awaiting Review'
for all [N] workflows."

---

### Item 25 — Owner review items are documented

**Claim to verify:** Any decisions or checks the owner needs to make
before activation are listed in the build log.

| Evidence | Tag | How to check |
|----------|-----|-------------|
| Each build log entry has an `Owner review items:` section | `[FILE]` | Check for section presence in each entry |
| `Owner review items:` is either non-empty (has items listed) or explicitly states "None" | `[FILE]` | Section must not be blank — blank means the builder did not consider this |

**If blank:** Mark `FAIL`. Builder must either list items or explicitly
write "None — no owner review items for this workflow."

---

## QA Blocked Condition

If qa-agent cannot access the n8n API (required for items 1–4, 5, 8,
9, 10–13, 15–20), it must stop and output:

```
QA BLOCKED — [client-slug]
n8n API is not accessible.

API-dependent items cannot be verified: 1, 2, 3, 5, 8, 9, 10, 11,
12, 13, 15, 16, 17, 18, 19, 20.

Items 15–18 (security checks) are mandatory and cannot be skipped.

QA cannot issue a verdict until API access is restored.
Owner: resolve n8n API access issue before re-running qa-agent.
```

QA does not issue a PASS for file-only items while API-dependent items
are blocked. The full checklist must be completable before a verdict
is issued.

---

## Owner Activation Checklist — Composition Rules

The Owner Activation Checklist at the bottom of qa-report.md is composed
from two sources:

**Source 1 — Owner review items from build-log.md**
Every item listed under `Owner review items:` in each build log entry
must appear in the checklist.

**Source 2 — OWNER-VERIFY items from QA**
Every item the qa-agent marked `OWNER-VERIFY` (rather than PASS/FAIL)
must appear in the checklist with the specific verification instruction.

**Format:**
```
## Owner Activation Checklist

Complete every item before activating any workflow.

From build log:
□ [Workflow name]: [owner review item from build log]
□ [Workflow name]: [owner review item from build log]

From QA verification:
□ [Item N]: [what the owner must check and confirm]
□ [Item N]: [what the owner must check and confirm]

DO NOT activate any workflow before completing this checklist.
```

If there are no items from either source: "Owner Activation Checklist:
No owner review items. QA confirmed all items independently."
