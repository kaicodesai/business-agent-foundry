# Handoff Specification — Phoenix Automation Agent Pipeline
Version: 1.0
Last updated: 2026-03-13

Defines the exact inputs, outputs, and acceptance criteria for every
handoff between the 5 agents in the Phoenix Automation delivery pipeline.
A handoff is only valid when ALL acceptance criteria are met. Any failed
criterion triggers the defined rejection path.

---

## Handoff Overview

```
lead-qualification-agent
        ↓  [H1]
process-mapping-agent
        ↓  [H2]
automation-scoping-agent
        ↓  [H3: owner review checkpoint]
workflow-builder-agent
        ↓  [H4]
qa-agent
        ↓  [H5: owner activation checkpoint]
LIVE
```

---

## H1 — Lead Qualification → Process Mapping

**Trigger:** Owner decides to proceed with an assessment call AND the call
has concluded.

**Who initiates:** Owner (manually triggers process-mapping-agent with
call notes after the call).

### Required inputs from lead-qualification-agent

| Input | Source | Required |
|-------|--------|----------|
| Raw assessment call notes | Owner pastes into process-mapping-agent | Yes |
| `lead_score_total` | Airtable record | Recommended |
| `lead_score_grade` | Airtable record | Recommended |
| `pre_call_brief` | Airtable record | Recommended |
| `industry`, `team_size`, `hours_lost_per_week` | Airtable record | Recommended |

Note: Airtable fields are "Recommended" because the owner may proceed
without a Typeform submission (e.g. referral leads who skipped the form).
The agent must still run with call notes alone if Airtable data is absent.

### Acceptance criteria — H1

All must be true before process-mapping-agent proceeds:

- [ ] **A1** — Call notes are present (any format — bullets, prose, mixed)
- [ ] **A2** — Call notes contain at least one identifiable manual process
  (something a person does repeatedly that could be automated)
- [ ] **A3** — Client company name is identifiable from the notes
  (required to name the client directory)
- [ ] **A4** — No `lead_score_grade = LOW` flag blocking this call
  (if LOW, owner must have explicitly confirmed to proceed)

### Rejection criteria — H1

If **A1 or A2 fails:**
```
HANDOFF REJECTED — H1
Missing: [call notes / identifiable process]
Action: Owner must provide call notes before process-mapping-agent runs.
```

If **A3 fails:**
```
HANDOFF REJECTED — H1
Cannot determine client name from notes.
Action: Owner to confirm client company name before proceeding.
```

### Output from process-mapping-agent (delivered to H2)

| Output | Path | Required |
|--------|------|----------|
| Process map | `docs/clients/[client-slug]/process-map.md` | Yes |
| At least 1 in-scope process scored ≥ 4/8 | Within process map | Yes |
| Recommended build order | Within process map | Yes |
| Flags section | Within process map | Yes (even if empty) |

---

## H2 — Process Mapping → Automation Scoping

**Trigger:** process-mapping-agent outputs the process map.

**Who initiates:** Owner (manually triggers automation-scoping-agent, or
it runs automatically if wired via n8n).

### Required inputs from process-mapping-agent

| Input | Path | Required |
|-------|------|----------|
| Process map | `docs/clients/[client-slug]/process-map.md` | Yes |
| ≥ 1 process scored IN SCOPE | Within process map | Yes |
| Build order listed | Within process map | Yes |
| ICP grade (if available) | Airtable / process map header | No |

### Acceptance criteria — H2

All must be true before automation-scoping-agent proceeds:

- [ ] **A1** — `docs/clients/[client-slug]/process-map.md` exists
- [ ] **A2** — Process map contains at least 1 process with status IN SCOPE
  (not all processes flagged OUT OF SCOPE or COMPLIANCE FLAG)
- [ ] **A3** — Every in-scope process has a complexity rating
  (LOW / MEDIUM / HIGH — not blank)
- [ ] **A4** — Every in-scope process has an estimated weekly time saving
  (exact figure or `[estimated]` marker — not blank)
- [ ] **A5** — Recommended build order is present

### Rejection criteria — H2

If **A2 fails** (no in-scope processes):
```
HANDOFF REJECTED — H2
No in-scope processes in process map.
Action: Owner to review OUT OF SCOPE and COMPLIANCE FLAG items.
Decide: (a) rescope, (b) refer out, (c) close the lead.
```

If **A3 or A4 fails:**
```
HANDOFF REJECTED — H2
Process map incomplete — missing [complexity rating / time estimate]
for: [process name(s)].
Action: Return to process-mapping-agent to complete scoring.
```

### Output from automation-scoping-agent (delivered to H3)

| Output | Path | Required |
|--------|------|----------|
| Internal scope of work | `docs/clients/[client-slug]/scope-of-work.md` | Yes |
| Client-facing proposal draft | `docs/clients/[client-slug]/proposal-draft.md` | Yes |
| Pricing tier determined | Within scope of work | Yes |
| ROI multiple calculated | Within scope of work | Yes |
| Owner flags documented | Within scope of work | Yes (even if empty) |

---

## H3 — Automation Scoping → Workflow Builder

**Gate type: OWNER REVIEW CHECKPOINT — agent cannot self-advance past this
point. The owner must explicitly approve before workflow-builder-agent runs.**

**Trigger:** Owner reviews and sends the proposal. Client accepts and pays.

**Who initiates:** Owner (manually triggers workflow-builder-agent after
confirming payment received and onboarding complete).

### Required inputs at H3

| Input | Source | Required |
|-------|--------|----------|
| Signed/accepted proposal | Owner confirmation | Yes |
| Payment received | Owner confirmation | Yes |
| `docs/clients/[client-slug]/scope-of-work.md` | automation-scoping-agent | Yes |
| Client n8n workspace created | onboarding-automation | Yes |
| Credentials template populated | Client + onboarding | Yes |

### Acceptance criteria — H3

All must be true before workflow-builder-agent proceeds:

- [ ] **A1** — `scope-of-work.md` exists and is complete (pricing tier,
  build order, tools required — all populated)
- [ ] **A2** — Owner has explicitly confirmed client accepted the proposal
- [ ] **A3** — Owner has explicitly confirmed payment received
- [ ] **A4** — Client n8n workspace/project folder exists
- [ ] **A5** — Credentials template workflow exists in client's n8n workspace
- [ ] **A6** — Every tool listed in scope-of-work.md has a corresponding
  pre-authenticated node in the credentials template
- [ ] **A7** — No unresolved COMPLIANCE FLAGs from the process map
  (owner must have explicitly cleared each one before building)
- [ ] **A8** — No raw API keys or credentials present in the current
  conversation or scope documents

### Rejection criteria — H3

If **A2 or A3 fails:**
```
HANDOFF BLOCKED — H3
Workflow builder cannot start without confirmed payment and proposal
acceptance. Owner must confirm both before triggering the build.
```

If **A4 or A5 fails:**
```
HANDOFF BLOCKED — H3
Client n8n workspace not ready.
Missing: [workspace / credentials template]
Action: Complete onboarding-automation before triggering build.
```

If **A6 fails:**
```
HANDOFF BLOCKED — H3
Missing credential in template: [tool name(s)]
Action: Owner to provide via 1Password before build starts.
```

If **A7 fails:**
```
HANDOFF BLOCKED — H3
Unresolved compliance flag: [flag description]
Action: Owner must clear this flag (confirm legal scope) before building.
```

### Output from workflow-builder-agent (delivered to H4)

| Output | Path / Location | Required |
|--------|----------------|----------|
| Built workflow(s) in n8n | Client n8n workspace | Yes |
| Build log entry per workflow | `docs/clients/[client-slug]/build-log.md` | Yes |
| Each workflow individually tested | Documented in build log | Yes |
| Error handling configured | Documented in build log | Yes |
| Status per workflow | "Built and tested — awaiting owner review" | Yes |

---

## H4 — Workflow Builder → QA

**Trigger:** workflow-builder-agent completes all workflows in scope and
writes final build log entries.

**Who initiates:** qa-agent runs automatically after build log confirms
all workflows are in "Built and tested — awaiting owner review" state.
Owner may also trigger manually.

### Required inputs from workflow-builder-agent

| Input | Path / Location | Required |
|-------|----------------|----------|
| Build log with entry per workflow | `docs/clients/[client-slug]/build-log.md` | Yes |
| Scope of work (QA reference) | `docs/clients/[client-slug]/scope-of-work.md` | Yes |
| Live workflows in client n8n workspace | Client n8n workspace | Yes |

### Acceptance criteria — H4

All must be true before qa-agent proceeds:

- [ ] **A1** — `build-log.md` exists and contains an entry for every
  workflow listed in `scope-of-work.md`
- [ ] **A2** — Every build log entry has Status:
  "Built and tested — awaiting owner review"
  (not "In progress", "Failed", or blank)
- [ ] **A3** — Every build log entry includes test results section with
  individual node test results documented
- [ ] **A4** — Every build log entry includes error handling status
  (Configured, or explicit reason if not configured)
- [ ] **A5** — All workflows are present and accessible in the client's
  n8n workspace at time of QA run

### Rejection criteria — H4

If **A1 fails** (missing build log entries):
```
HANDOFF REJECTED — H4
Build log missing entries for: [workflow name(s)]
Action: Return to workflow-builder-agent to complete the build.
```

If **A2 fails** (workflow not in "awaiting review" state):
```
HANDOFF REJECTED — H4
Workflow not ready for QA: [workflow name] — Status: [current status]
Action: workflow-builder-agent must resolve before QA runs.
```

### Output from qa-agent (delivered to H5)

| Output | Path | Required |
|--------|------|----------|
| QA report | `docs/clients/[client-slug]/qa-report.md` | Yes |
| Verdict | QA PASS / QA CONDITIONAL PASS / QA FAIL | Yes |
| Checklist results (25 items) | Within QA report | Yes |
| Owner activation checklist | Within QA report | Yes |
| Failures list (if any) | Within QA report | Yes (even if "None") |

---

## H5 — QA → Owner Activation

**Gate type: OWNER ACTIVATION CHECKPOINT — no agent activates workflows.
This is a human step, always.**

**Trigger:** qa-agent issues QA PASS or QA CONDITIONAL PASS verdict.

**Who initiates:** Owner reviews QA report and activates each workflow
manually in n8n.

### Acceptance criteria — H5

All must be true before owner activates any workflow:

- [ ] **A1** — QA report exists at `docs/clients/[client-slug]/qa-report.md`
- [ ] **A2** — Verdict is QA PASS or QA CONDITIONAL PASS
  (QA FAIL blocks activation entirely — return to workflow-builder-agent)
- [ ] **A3** — Owner has reviewed the owner activation checklist in the
  QA report and confirmed each item
- [ ] **A4** — If QA CONDITIONAL PASS: owner has verified all conditional
  fixes are complete before activating

### Rejection criteria — H5

If verdict is QA FAIL:
```
ACTIVATION BLOCKED — H5
QA verdict: FAIL
Return to workflow-builder-agent with failures listed in qa-report.md.
Owner must not activate any workflow until QA PASS is issued.
```

### Final output (post-activation)

| Output | Action |
|--------|--------|
| Workflows set to Active in n8n | Owner action |
| ClickUp tasks marked "Live" | Owner or status-update-agent |
| status-update-agent begins cron | Automatic — triggered by activation |

---

## Return Paths Summary

| Failure point | Returns to | Who decides |
|---------------|-----------|-------------|
| H1: No call notes | Owner | Owner |
| H1: No identifiable process | Owner | Owner |
| H2: No in-scope processes | Owner → rescope decision | Owner |
| H2: Incomplete scoring | process-mapping-agent | Agent |
| H3: No payment/acceptance | Owner | Owner |
| H3: Missing credentials | Owner + client | Owner |
| H3: Compliance flag unresolved | Owner | Owner |
| H4: Build log incomplete | workflow-builder-agent | Agent |
| H4: Workflow not tested | workflow-builder-agent | Agent |
| H5: QA FAIL | workflow-builder-agent | Agent + Owner |
| H5: QA CONDITIONAL PASS items unresolved | Owner verifies | Owner |
