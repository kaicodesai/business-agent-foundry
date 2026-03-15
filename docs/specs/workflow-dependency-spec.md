# Workflow Dependency Specification
Version: 1.0
Last updated: 2026-03-15

Correction layer for the Phoenix Automation 5-agent pipeline. This spec
formalises every dependency in the pipeline as explicit pre-conditions and
post-conditions. It is the authoritative reference for determining whether
the system is in a valid state at any point.

Cross-references:
- Handoff inputs/outputs → `docs/workflows/handoff-spec.md`
- Status transitions → `docs/workflows/project-status-spec.md`
- Step-by-step sequence → `docs/workflows/workflow-sequence.md`

---

## Why This Spec Exists

The existing handoff-spec.md defines acceptance criteria per handoff. What
was missing is a unified dependency graph that makes explicit:

1. What each stage **requires** to start (pre-conditions)
2. What each stage **produces** that downstream stages depend on (post-conditions)
3. **Who** can verify each condition (agent, owner, or client)

Without this, agents can start on incomplete inputs, produce outputs that
don't satisfy downstream needs, and the owner has no single checklist to
confirm system state before triggering a stage.

---

## Verification Categories

Every pre-condition is tagged with who can confirm it:

| Tag | Meaning |
|-----|---------|
| `[AGENT]` | Agent can verify by reading a file, checking a path, or parsing structured data |
| `[OWNER]` | Requires human judgment, confirmation, or external action |
| `[CLIENT]` | Requires the client to have done something — owner confirms on client's behalf |

---

## Pipeline Dependency Map

```
[INBOUND LEAD]
      │
      ▼
Stage 1: Lead Qualification
      │  produces → lead_score, pre_call_brief (Airtable)
      ▼
[OWNER DECIDES TO PROCEED]
      │  requires → booking confirmed
      ▼
Stage 2: Assessment Call (owner-run)
      │  produces → raw call notes
      ▼
Stage 3: Process Mapping
      │  requires → call notes, client name
      │  produces → process-map.md
      ▼
Stage 4: Automation Scoping
      │  requires → process-map.md with ≥1 in-scope process
      │  produces → scope-of-work.md, proposal-draft.md
      ▼
[OWNER CHECKPOINT 1: Review & send proposal]
      │  requires → owner reviews both files, sends to client
      ▼
Stage 5: Proposal / Client Decision
      │  produces → proposal.accepted + payment
      ▼
Stage 6: Onboarding
      │  requires → payment confirmed
      │  produces → n8n workspace, credentials template
      ▼
[OWNER CHECKPOINT 2: Confirm build ready]
      │  requires → all onboarding-readiness pre-conditions met
      ▼
Stage 7: Workflow Build
      │  requires → scope-of-work.md, workspace, credentials
      │  produces → built workflows in n8n, build-log.md
      ▼
[OWNER CHECKPOINT 3: Review build log]
      │  requires → owner reads BUILD COMPLETE summary
      ▼
Stage 8: QA
      │  requires → build-log.md complete, workflows accessible
      │  produces → qa-report.md with PASS/FAIL verdict
      ▼
[OWNER CHECKPOINT 4: Activate]
      │  requires → QA PASS or CONDITIONAL PASS, owner checklist complete
      ▼
[LIVE]
```

---

## Stage 1 — Lead Qualification

**Agent:** lead-qualification-agent
**Status on entry:** `lead.new`
**Status on exit:** `lead.qualified` or `lead.disqualified`

### Pre-conditions (to run)

| # | Condition | Verifier |
|---|-----------|----------|
| P1.1 | Inbound contact exists (chatbot message or Typeform submission) | `[AGENT]` |
| P1.2 | Airtable base is accessible (for Mode B — Typeform) | `[AGENT]` |

### Post-conditions (guaranteed on exit)

| # | Output | Verifier | Destination |
|---|--------|----------|-------------|
| O1.1 | `lead_score_total` (0–8) written to Airtable | `[AGENT]` | Airtable lead record |
| O1.2 | `lead_score_grade` (HIGH / MEDIUM / LOW) written to Airtable | `[AGENT]` | Airtable lead record |
| O1.3 | `pre_call_brief` written to Airtable | `[AGENT]` | Airtable lead record |
| O1.4 | Routing decision documented (Calendly link sent / soft close) | `[AGENT]` | Airtable lead record |

### Boundary condition

If `lead_score_grade = LOW`, the agent routes to soft close. Owner must
explicitly override (`[OWNER]`) to proceed to assessment. The override
must be recorded in Airtable before Stage 3 begins.

---

## Stage 2 — Assessment Call

**Agent:** None (owner-run)
**Status on entry:** `assessment.scheduled`
**Status on exit:** `assessment.completed`

### Pre-conditions (to run)

| # | Condition | Verifier |
|---|-----------|----------|
| P2.1 | Lead has a booked Calendly slot | `[OWNER]` |
| P2.2 | pre_call_brief reviewed by owner before the call | `[OWNER]` |

### Post-conditions (guaranteed on exit)

| # | Output | Verifier | Destination |
|---|--------|----------|-------------|
| O2.1 | Raw call notes captured (any format) | `[OWNER]` | Owner's notes (to be pasted into Stage 3) |
| O2.2 | Client company name identifiable from notes | `[OWNER]` | Required to create client directory slug |
| O2.3 | At least one manual process mentioned in notes | `[OWNER]` | Required for Stage 3 to proceed |

### Boundary condition

If no fit is identified on the call, status → `closed.no_deal`. Do not
proceed to Stage 3.

---

## Stage 3 — Process Mapping

**Agent:** process-mapping-agent
**Status on entry:** `assessment.completed`
**Status on exit:** `mapping.complete`

### Pre-conditions (to run)

| # | Condition | Verifier |
|---|-----------|----------|
| P3.1 | Raw call notes are present | `[AGENT]` — agent checks at startup |
| P3.2 | Client company name is identifiable | `[AGENT]` — required to name output file |
| P3.3 | No `lead_score_grade = LOW` without owner override recorded | `[OWNER]` |

### Post-conditions (guaranteed on exit)

| # | Output | Verifier | Destination |
|---|--------|----------|-------------|
| O3.1 | `docs/clients/[client-slug]/process-map.md` exists | `[AGENT]` | File system |
| O3.2 | ≥ 1 process with status `IN SCOPE` | `[AGENT]` | process-map.md |
| O3.3 | Every in-scope process has complexity rating (LOW / MEDIUM / HIGH) | `[AGENT]` | process-map.md |
| O3.4 | Every in-scope process has an estimated weekly time saving (hours) | `[AGENT]` | process-map.md |
| O3.5 | Recommended build order present | `[AGENT]` | process-map.md |
| O3.6 | `Flags:` section present (even if empty) | `[AGENT]` | process-map.md |

### Boundary condition

If O3.2 fails (no in-scope processes): output a clear rejection, stop,
and notify the owner. Owner decides: rescope, refer out, or close.

---

## Stage 4 — Automation Scoping

**Agent:** automation-scoping-agent
**Status on entry:** `mapping.complete`
**Status on exit:** `scoping.complete`

### Pre-conditions (to run)

| # | Condition | Verifier |
|---|-----------|----------|
| P4.1 | `docs/clients/[client-slug]/process-map.md` exists | `[AGENT]` |
| P4.2 | process-map.md contains ≥ 1 `IN SCOPE` process | `[AGENT]` |
| P4.3 | Every in-scope process has complexity rating and time estimate | `[AGENT]` |
| P4.4 | Build order is present in process-map.md | `[AGENT]` |

### Post-conditions (guaranteed on exit)

| # | Output | Verifier | Destination |
|---|--------|----------|-------------|
| O4.1 | `docs/clients/[client-slug]/scope-of-work.md` exists | `[AGENT]` | File system |
| O4.2 | `docs/clients/[client-slug]/proposal-draft.md` exists | `[AGENT]` | File system |
| O4.3 | Pricing tier determined (Starter / Growth) | `[AGENT]` | scope-of-work.md |
| O4.4 | ROI multiple calculated (annual hours × $25 ÷ quoted price ≥ 3×) | `[AGENT]` | scope-of-work.md |
| O4.5 | Tools required list present | `[AGENT]` | scope-of-work.md |
| O4.6 | `Owner flags:` section present (even if empty) | `[AGENT]` | scope-of-work.md |
| O4.7 | API cost estimate disclosed in proposal-draft.md | `[AGENT]` | proposal-draft.md |

---

## Owner Checkpoint 1 — Review and Send Proposal

**No agent runs here. This is a human step.**

### Pre-conditions (for owner to proceed)

| # | Condition | Verifier |
|---|-----------|----------|
| C1.1 | scope-of-work.md and proposal-draft.md both exist | `[OWNER]` |
| C1.2 | Pricing tier and ROI multiple are defensible | `[OWNER]` |
| C1.3 | All owner flags in scope-of-work.md are resolved | `[OWNER]` |
| C1.4 | API cost estimate is present and accurate | `[OWNER]` |
| C1.5 | Proposal tone and delivery timeline are accurate | `[OWNER]` |

### Post-condition

Owner sends proposal to client → status: `proposal.sent`.

---

## Stage 5 — Proposal Decision

**Agent:** None
**Status transitions:** `proposal.sent` → `proposal.accepted` or `proposal.declined`

### Post-conditions (to advance to Stage 6)

| # | Condition | Verifier |
|---|-----------|----------|
| O5.1 | Client has explicitly accepted the proposal | `[OWNER]` — recorded in Airtable |
| O5.2 | Payment received | `[OWNER]` — recorded in Airtable |

Both O5.1 and O5.2 must be true before onboarding begins. Either alone
is not sufficient.

---

## Stage 6 — Onboarding

**Agent:** onboarding-automation (separate from the 5-agent delivery pipeline)
**Status on entry:** `proposal.accepted`
**Status on exit:** `build.ready`

### Pre-conditions (to run onboarding-automation)

| # | Condition | Verifier |
|---|-----------|----------|
| P6.1 | Payment confirmed | `[OWNER]` |
| P6.2 | scope-of-work.md exists with tools required list | `[AGENT]` |
| P6.3 | Client has agreed to provide credentials for all listed tools | `[OWNER]` |

### Post-conditions (guaranteed on exit — required to reach build.ready)

| # | Output | Verifier | Destination |
|---|--------|----------|-------------|
| O6.1 | Client n8n workspace/project folder exists | `[AGENT]` | n8n |
| O6.2 | Credentials template workflow exists in client's n8n workspace | `[AGENT]` | n8n |
| O6.3 | Every tool in scope-of-work.md has a pre-authenticated node in the credentials template | `[OWNER]` | n8n credentials template |
| O6.4 | No credentials appear in any conversation or document | `[OWNER]` | Confirmed by inspection |

Full detail: `docs/specs/onboarding-readiness-spec.md`

---

## Owner Checkpoint 2 — Confirm Build Ready

**No agent runs here. This is a human step.**

### Pre-conditions (all must be confirmed before triggering build)

| # | Condition | Verifier |
|---|-----------|----------|
| C2.1 | Payment confirmed and recorded | `[OWNER]` |
| C2.2 | scope-of-work.md is final and complete | `[OWNER]` |
| C2.3 | Client n8n workspace exists | `[OWNER]` |
| C2.4 | Credentials template populated for all scope tools | `[OWNER]` |
| C2.5 | No unresolved compliance flags from process-map.md | `[OWNER]` |
| C2.6 | No raw credentials in conversation or any document | `[OWNER]` |

All 6 conditions must be true. If any fail, the owner resolves them
before triggering workflow-builder-agent.

---

## Stage 7 — Workflow Build

**Agent:** workflow-builder-agent
**Status on entry:** `build.in_progress`
**Status on exit:** `build.complete` or `build.blocked`

### Pre-conditions (to run — agent verifies at startup)

| # | Condition | Verifier |
|---|-----------|----------|
| P7.1 | `docs/clients/[client-slug]/scope-of-work.md` exists | `[AGENT]` |
| P7.2 | Client n8n workspace accessible | `[AGENT]` |
| P7.3 | Credentials template exists in client workspace | `[AGENT]` |
| P7.4 | No raw credentials in current conversation | `[AGENT]` — scan on startup |

### Post-conditions (guaranteed on `build.complete`)

| # | Output | Verifier | Destination |
|---|--------|----------|-------------|
| O7.1 | `docs/clients/[client-slug]/build-log.md` exists | `[AGENT]` | File system |
| O7.2 | Build log has an entry for every workflow in scope-of-work.md | `[AGENT]` | build-log.md |
| O7.3 | Every entry has Status: `Built and tested — awaiting owner review` | `[AGENT]` | build-log.md |
| O7.4 | Every entry includes individual node test results | `[AGENT]` | build-log.md |
| O7.5 | Every entry includes error handling status | `[AGENT]` | build-log.md |
| O7.6 | Every entry includes `Owner review items:` section | `[AGENT]` | build-log.md |
| O7.7 | All workflows present in client n8n workspace | `[AGENT]` | n8n |

### Boundary condition — build.blocked

When the agent hits an unresolvable blocker, it outputs a `BUILD BLOCKED`
notice with the exact reason and stops. Status → `build.blocked`. Owner
resolves the specific issue and re-triggers. The build resumes at the
blocked node — it does not restart.

---

## Owner Checkpoint 3 — Review Build Log

**No agent runs here. This is a human step (lightweight).**

### Pre-conditions

| # | Condition | Verifier |
|---|-----------|----------|
| C3.1 | build-log.md exists with all workflows at `Built and tested` status | `[OWNER]` |
| C3.2 | Owner has read the BUILD COMPLETE summary | `[OWNER]` |
| C3.3 | Owner has reviewed all `Owner review items:` sections | `[OWNER]` |

This checkpoint is intentionally lightweight. Its purpose is to catch
owner-only decisions before QA runs — not to duplicate the QA checklist.

---

## Stage 8 — QA

**Agent:** qa-agent
**Status on entry:** `qa.in_progress`
**Status on exit:** `qa.pass` or `qa.fail`

### Pre-conditions (to run — agent verifies at startup)

| # | Condition | Verifier |
|---|-----------|----------|
| P8.1 | `docs/clients/[client-slug]/build-log.md` exists | `[AGENT]` |
| P8.2 | `docs/clients/[client-slug]/scope-of-work.md` exists | `[AGENT]` |
| P8.3 | All workflows in build-log.md are at status `Built and tested — awaiting owner review` | `[AGENT]` |
| P8.4 | All workflows are accessible in client n8n workspace | `[AGENT]` |

### Post-conditions (guaranteed on exit)

| # | Output | Verifier | Destination |
|---|--------|----------|-------------|
| O8.1 | `docs/clients/[client-slug]/qa-report.md` exists | `[AGENT]` | File system |
| O8.2 | Verdict stated: QA PASS / QA CONDITIONAL PASS / QA FAIL | `[AGENT]` | qa-report.md |
| O8.3 | All 25 checklist items recorded with PASS / FAIL / SKIP | `[AGENT]` | qa-report.md |
| O8.4 | Failures list present (or "None — all checks passed") | `[AGENT]` | qa-report.md |
| O8.5 | Owner activation checklist present | `[AGENT]` | qa-report.md |

Full evidence requirements per checklist item: `docs/specs/qa-evidence-spec.md`

---

## Owner Checkpoint 4 — Activate

**No agent activates workflows. This is always a human step.**

### Pre-conditions

| # | Condition | Verifier |
|---|-----------|----------|
| C4.1 | qa-report.md exists with verdict QA PASS or QA CONDITIONAL PASS | `[OWNER]` |
| C4.2 | Owner has read qa-report.md in full | `[OWNER]` |
| C4.3 | Owner has completed every item in the owner activation checklist | `[OWNER]` |
| C4.4 | If QA CONDITIONAL PASS: all conditional fixes are complete | `[OWNER]` |

### Post-conditions

| # | Output | Verifier |
|---|--------|----------|
| A4.1 | All workflows activated in n8n | `[OWNER]` |
| A4.2 | ClickUp tasks marked "Live" | `[OWNER]` |
| A4.3 | Airtable `project_status` updated to `live` | `[OWNER]` |

---

## Dependency Violations — Correction Protocol

If any agent is invoked when its pre-conditions are not met, the agent
must:

1. Stop immediately
2. Output a `DEPENDENCY VIOLATION` notice naming the unmet pre-conditions
3. Name the specific file or action that must exist/occur first
4. Not partially execute

**Format:**
```
DEPENDENCY VIOLATION — [agent name]
Unmet pre-conditions:
- [P#.#]: [description of what is missing]
- [P#.#]: [description of what is missing]

Required before this agent can run:
[Exact action the owner or prior agent must take]
```

This replaces silent failure or partial output, which are harder to
diagnose than a clear stop with a named cause.

---

## Summary Table — Who Produces What

| Output | Produced by | Consumed by | Verifier |
|--------|-------------|-------------|----------|
| lead_score, pre_call_brief | lead-qualification-agent | Owner (assessment prep) | `[AGENT]` |
| call notes | Owner | process-mapping-agent | `[OWNER]` |
| process-map.md | process-mapping-agent | automation-scoping-agent | `[AGENT]` |
| scope-of-work.md | automation-scoping-agent | workflow-builder-agent, qa-agent | `[AGENT]` |
| proposal-draft.md | automation-scoping-agent | Owner (sends to client) | `[OWNER]` |
| client n8n workspace | onboarding-automation | workflow-builder-agent | `[AGENT]` |
| credentials template | onboarding-automation + client | workflow-builder-agent | `[OWNER]` |
| build-log.md | workflow-builder-agent | qa-agent | `[AGENT]` |
| qa-report.md | qa-agent | Owner (activation decision) | `[OWNER]` |
| live workflows | Owner (activation) | Client (production use) | `[OWNER]` |
