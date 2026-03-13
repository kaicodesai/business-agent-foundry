# Workflow Sequence — Phoenix Automation Agent Pipeline
Version: 1.0
Last updated: 2026-03-13

The single reference for running a client engagement end to end. Every
step is in order. Every handoff gate is named. Every owner checkpoint is
explicit. Read top to bottom when working a live project.

Cross-references:
- Exact handoff inputs/outputs → `handoff-spec.md`
- Status transitions → `project-status-spec.md`

---

## Full Sequence Diagram

```
INBOUND LEAD
     │
     ▼
┌─────────────────────────────────┐
│   lead-qualification-agent      │
│   Mode A: chatbot (real-time)   │
│   Mode B: Typeform scorer       │
└─────────────────────────────────┘
     │
     ├── Cold lead ──────────────────────────────────► CLOSED (no handoff)
     │
     ├── Low score → owner reviews ─── No ──────────► CLOSED
     │                                │
     │                               Yes
     │                                │
     ▼                                ▼
HOT LEAD / QUALIFIED           OWNER DECIDES TO PROCEED
     │
     ▼
Assessment call booked (Calendly)
     │
     ▼
ASSESSMENT CALL (owner-run, 30 min)
     │
     ├── No fit on call ────────────────────────────► CLOSED
     │
     ▼
┌─────────────────────────────────┐
│   process-mapping-agent         │  ← owner pastes call notes
│   Input: raw call notes         │
│   Output: process-map.md        │
└─────────────────────────────────┘
     │
     ├── No in-scope processes ──── owner reviews ──► CLOSED or rescope
     │
     ▼
[H2 gate: ≥ 1 in-scope process, scored, build order set]
     │
     ▼
┌─────────────────────────────────┐
│   automation-scoping-agent      │
│   Input: process-map.md         │
│   Output: scope-of-work.md      │
│           proposal-draft.md     │
└─────────────────────────────────┘
     │
     ▼
★ OWNER CHECKPOINT 1 — REVIEW & SEND PROPOSAL ★
     │
     ├── Owner revises draft ──────────────────────► (back to review)
     ├── Owner decides not to send ─────────────────► CLOSED
     │
     ▼
Proposal sent to client
     │
     ├── Client declines ───────────────────────────► CLOSED
     ├── No response → owner follow-up ─────────────► (stays proposal.sent)
     │
     ▼
Client accepts + pays
     │
     ▼
ONBOARDING (owner + onboarding-automation)
- n8n workspace created for client
- Credentials template populated (all scope tools pre-authed)
     │
     ├── Credentials stalled ─────── owner chases ──► (stays onboarding)
     │
     ▼
★ OWNER CHECKPOINT 2 — CONFIRM BUILD READY ★
(payment confirmed, workspace ready, all credentials in template)
     │
     ▼
┌─────────────────────────────────┐
│   workflow-builder-agent        │
│   Input: scope-of-work.md       │
│          client n8n workspace   │
│          credentials template   │
│   Output: built + tested        │
│           workflows in n8n      │
│           build-log.md          │
└─────────────────────────────────┘
     │
     ├── Node fails after 3 attempts ──────────────► BUILD BLOCKED
     ├── Missing credential mid-build ─────────────► BUILD BLOCKED
     ├── Tool not in n8n ──────────────────────────► BUILD BLOCKED
     ├── Undefined branch logic ──────────────────► BUILD BLOCKED
     │        │
     │        ▼
     │   ★ OWNER RESOLVES BLOCKER ★
     │        │
     │        └──────────────────────────────────► (build resumes)
     │
     ▼
★ OWNER CHECKPOINT 3 — REVIEW BUILD LOG ★
(lightweight — check build summary and owner review items)
     │
     ▼
┌─────────────────────────────────┐
│   qa-agent                      │
│   Input: build-log.md           │
│          scope-of-work.md       │
│          live n8n workflows      │
│   Output: qa-report.md          │
│           PASS / FAIL verdict   │
└─────────────────────────────────┘
     │
     ├── QA FAIL ────── failures returned ─────────► workflow-builder-agent
     │                  (returns to build.in_progress, then QA re-runs)
     │
     ├── QA CONDITIONAL PASS ── owner verifies fixes ► activation.pending
     │
     ▼
QA PASS
     │
     ▼
★ OWNER CHECKPOINT 4 — ACTIVATE ★
(read qa-report.md, complete activation checklist, activate in n8n)
     │
     ▼
LIVE — workflows active in client n8n workspace
     │
     ▼
status-update-agent begins (cron — weekly client reports)
```

---

## Step-by-Step Reference

### Step 1 — Lead arrives

**Agent:** lead-qualification-agent
**Status:** `lead.new`

**Mode A — Chatbot:**
Ask 3 questions (business type, team size, biggest manual task). Score
internally. Route hot leads to Calendly. Route cold leads to a soft
close. Borderline leads get one clarifying question.

**Mode B — Typeform:**
Score submission across 4 dimensions (industry, team size, pain
specificity, time lost). Write score to Airtable. Generate pre-call
brief. Email brief to owner if HIGH grade.

**Outputs produced:**
- Airtable: `lead_score_total`, `lead_score_grade`, `pre_call_brief`
- For hot/HIGH leads: Calendly booking prompted

**Advance condition:** Lead books assessment call.
**Exit condition:** Cold/LOW lead with no booking → `lead.disqualified`.

---

### Step 2 — Assessment call

**Agent:** None (owner-run call)
**Status:** `assessment.scheduled` → `assessment.completed`

Owner conducts the 30-minute assessment using the pre-call brief from
lead-qualification-agent. Owner takes notes in any format.

**Owner produces:** Raw call notes (bullets, prose, or mixed).

**Advance condition:** Call completed with notes captured.
**Exit condition:** No fit identified on the call → `closed.no_deal`.

---

### Step 3 — Process mapping

**Agent:** process-mapping-agent
**Status:** `mapping.in_progress`
**Trigger:** Owner pastes call notes into the agent.

Agent extracts manual processes, scores each (0–8), estimates time saved,
classifies complexity (LOW/MEDIUM/HIGH/OUT OF SCOPE), inventories tools,
and recommends build order.

**File written:** `docs/clients/[client-slug]/process-map.md`

**H2 gate before advancing (all required):**
- ≥ 1 process scored IN SCOPE
- Every in-scope process has complexity rating and time estimate
- Build order present

**Advance condition:** Gate passes → `mapping.complete`.
**Return path:** No in-scope processes → owner decides to rescope or close.

---

### Step 4 — Scoping and proposal

**Agent:** automation-scoping-agent
**Status:** `scoping.in_progress`
**Trigger:** Owner triggers after reviewing process map.

Agent reads process map, determines pricing tier (Starter $1,500–$3,000
or Growth $3,000–$7,000), calculates ROI multiple, writes the internal
scope and client proposal draft. Flags anything the owner must check
before sending.

**Files written:**
- `docs/clients/[client-slug]/scope-of-work.md`
- `docs/clients/[client-slug]/proposal-draft.md`

**Advance condition:** Both files written → `scoping.complete`.

---

### Step 5 — Owner checkpoint 1: Send the proposal

**Agent:** None
**Status:** `scoping.complete` → `proposal.sent`

Owner reads both files. Checks:
- Pricing tier and ROI multiple are defensible
- Proposal tone and time estimates are accurate
- API cost disclosure is present
- Any owner flags in scope-of-work.md are resolved

Owner sends the proposal (email, Notion, PDF — owner's method).

**Advance condition:** Owner sends → `proposal.sent`.
**Exit condition:** Owner decides not to send → `closed.no_deal`.

---

### Step 6 — Proposal decision

**Agent:** None
**Status:** `proposal.sent` → `proposal.accepted` or `proposal.declined`

Client responds. Owner records the outcome in Airtable and ClickUp.

**Advance condition:** Client accepts → `proposal.accepted`.
**Exit condition:** Client declines → `proposal.declined` (terminal).

---

### Step 7 — Payment and onboarding

**Agent:** onboarding-automation (separate, not in this 5-agent pipeline)
**Status:** `proposal.accepted` → `onboarding.in_progress` → `build.ready`

Owner confirms payment received. onboarding-automation (or owner manually)
creates the client's n8n workspace and populates the credentials template.

Every tool listed in `scope-of-work.md` must have a pre-authenticated node
in the credentials template before the build starts.

**Advance condition:** workspace exists + all credentials in template
→ `build.ready`.
**Hold condition:** Credentials not provided → stays `onboarding.in_progress`
until resolved.

---

### Step 8 — Owner checkpoint 2: Start the build

**Agent:** None → workflow-builder-agent
**Status:** `build.ready` → `build.in_progress`

Owner confirms:
- Payment received
- n8n workspace ready
- All credentials in template
- No unresolved compliance flags
- No raw credentials in conversation

Owner triggers workflow-builder-agent.

**Advance condition:** All confirmed → owner triggers build.

---

### Step 9 — Build

**Agent:** workflow-builder-agent
**Status:** `build.in_progress`

Agent works through each automation in scope-of-work.md in build order.
For each automation: plan → build node by node → test each node → full
end-to-end test → configure error handling → write build log entry.

**Node discipline:** Build one node, test it, then build the next. Never
build ahead without testing. Maximum 3 fix attempts per node before
escalating to owner.

**Normal path:**
All workflows built, tested, error handling configured, build log complete
→ `build.complete`.

**Blocked path:**
Agent hits an unresolvable problem → outputs BUILD BLOCKED with exact
reason → `build.blocked` → owner resolves → `build.in_progress` resumes.

**Files written:** `docs/clients/[client-slug]/build-log.md`

---

### Step 9a — Unblocking (when build.blocked)

**Agent:** None (owner resolution) → workflow-builder-agent (resumes)

Owner reads the BUILD BLOCKED output. Resolves the specific issue (adds
credential, makes scope decision, clears compliance flag). Confirms
resolution. Build resumes at the blocked node.

Return paths by blocker type:

| Blocker | Owner action | Resumes at |
|---------|-------------|-----------|
| Missing credential | Provide via 1Password; client adds to n8n | Same node |
| Tool not in n8n | Decision: bridge / alternative / descope | Same node or skip |
| Node fails 3× | Review error; reset credential or escalate to n8n | Same node |
| Branch logic undefined | Define the rule in writing | Same node |
| Compliance flag hit | Confirm scope in writing | Same node |
| Email/payment/delete unclear | Define exact trigger condition | Same node |

---

### Step 10 — Owner checkpoint 3: Review build

**Agent:** None
**Status:** `build.complete`

Owner reads the BUILD COMPLETE summary from workflow-builder-agent. Checks
"Owner review items" in build-log.md. Optionally opens n8n to do a
visual inspection.

This checkpoint is intentionally lightweight — it exists to catch anything
the owner must verify or decide before QA runs, not to re-do QA.

**Advance condition:** Owner satisfied → triggers qa-agent → `qa.in_progress`.
**Return condition:** Owner spots an issue → returns to workflow-builder-agent
with specific instructions → `build.in_progress`.

---

### Step 11 — QA

**Agent:** qa-agent
**Status:** `qa.in_progress`

Agent runs the 25-item checklist across all workflows:
- Trigger verification (4 items)
- Node-by-node data flow (5 items)
- Error handling (5 items)
- Credential and security checks (4 items) — mandatory, cannot skip
- Scope adherence (4 items)
- Documentation completeness (3 items)

**Possible verdicts:**

| Verdict | Condition | Next step |
|---------|-----------|-----------|
| QA PASS | 0 FAILs, 0 unacceptable SKIPs | → `qa.pass` |
| QA CONDITIONAL PASS | 1–2 minor FAILs, no security/scope FAILs | → `qa.pass` (with conditions) |
| QA FAIL | Any security/scope FAIL, or 3+ FAILs | → `qa.fail` → builder |

**File written:** `docs/clients/[client-slug]/qa-report.md`

---

### Step 11a — QA failure return loop

**When QA FAILs:**

qa-agent outputs the exact failure list. Failures are returned to
workflow-builder-agent with each item numbered and described. Status
returns to `build.in_progress`.

workflow-builder-agent fixes only the listed failures — it does not
re-build the entire workflow. After fixes are complete, it updates
the build log and signals that QA should re-run.

qa-agent then runs the full checklist again from the start. There is
no partial re-run — the full 25-item checklist always runs.

**Maximum iterations:** Not formally capped, but the owner should be
consulted if QA fails 2 consecutive times on the same items. Repeated
QA failures on the same issue indicate a build problem that may require
owner input to resolve.

---

### Step 12 — Owner checkpoint 4: Activate

**Agent:** None
**Status:** `qa.pass` → `activation.pending` → `live`

Owner reads qa-report.md in full. Completes the owner activation
checklist at the bottom of the report. For QA CONDITIONAL PASS, verifies
each conditional fix is done before proceeding.

Owner activates each workflow in n8n manually. No agent activates
workflows under any circumstances.

**After activation:**
- status-update-agent begins automated weekly client reports via n8n cron
- ClickUp tasks marked "Live"
- Airtable `project_status` updated to `live`

**Advance condition:** Owner activates → `live`.
**Hold condition:** Owner not ready (client not ready, pending final check)
→ stays `activation.pending` until owner acts.

---

## Quick Reference — Owner Decision Points

| When | Owner decides | If yes → | If no → |
|------|--------------|----------|---------|
| After scoping | Send proposal? | `proposal.sent` | `closed.no_deal` |
| After acceptance | Payment received? | `onboarding.in_progress` | Wait |
| Before build | All prerequisites met? | `build.in_progress` | Fix prerequisites |
| During build | Resolve blocker? | Build resumes | Close or descope |
| After build | QA looks ready? | `qa.in_progress` | Return to builder |
| After QA PASS | Activate now? | `live` | `activation.pending` |

---

## File Locations by Step

| Step | Agent | Files produced |
|------|-------|---------------|
| 3 | process-mapping-agent | `docs/clients/[slug]/process-map.md` |
| 4 | automation-scoping-agent | `docs/clients/[slug]/scope-of-work.md` |
| 4 | automation-scoping-agent | `docs/clients/[slug]/proposal-draft.md` |
| 9 | workflow-builder-agent | `docs/clients/[slug]/build-log.md` |
| 11 | qa-agent | `docs/clients/[slug]/qa-report.md` |

All client files live under `docs/clients/[client-slug]/`. The slug is
derived from the company name (lowercase, hyphens, no spaces).
