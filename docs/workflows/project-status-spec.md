# Project Status Specification — Phoenix Automation
Version: 1.0
Last updated: 2026-03-13

Defines every status a client project can be in, the conditions that
move it forward, the conditions that push it back, and the owner actions
required at each checkpoint.

Every active client project has exactly one status at any time. Status
is the source of truth for what happens next.

---

## Status Registry

| # | Status | Who owns it | Agent active |
|---|--------|-------------|-------------|
| 1 | `lead.new` | lead-qualification-agent | lead-qualification-agent |
| 2 | `lead.qualified` | Owner | — |
| 3 | `lead.disqualified` | Owner | — |
| 4 | `assessment.scheduled` | Owner | — |
| 5 | `assessment.completed` | Owner | — |
| 6 | `mapping.in_progress` | process-mapping-agent | process-mapping-agent |
| 7 | `mapping.complete` | Owner | — |
| 8 | `scoping.in_progress` | automation-scoping-agent | automation-scoping-agent |
| 9 | `scoping.complete` | Owner | — |
| 10 | `proposal.sent` | Owner | — |
| 11 | `proposal.accepted` | Owner | — |
| 12 | `proposal.declined` | Owner | — |
| 13 | `onboarding.in_progress` | Owner | — |
| 14 | `build.ready` | Owner | — |
| 15 | `build.in_progress` | workflow-builder-agent | workflow-builder-agent |
| 16 | `build.blocked` | Owner | — |
| 17 | `build.complete` | Owner | — |
| 18 | `qa.in_progress` | qa-agent | qa-agent |
| 19 | `qa.pass` | Owner | — |
| 20 | `qa.fail` | workflow-builder-agent | workflow-builder-agent |
| 21 | `activation.pending` | Owner | — |
| 22 | `live` | Owner / status-update-agent | status-update-agent |
| 23 | `closed.no_deal` | Owner | — |
| 24 | `closed.post_delivery` | Owner | — |

---

## Status Transition Map

### Acquisition phase

```
[lead.new]
  → PASS (hot lead routed to Calendly):    → assessment.scheduled
  → PASS (cold lead):                      → lead.disqualified
  → Typeform scored HIGH/MEDIUM:           → lead.qualified → assessment.scheduled
  → Typeform scored LOW:                   → lead.qualified (owner decides)
```

```
[lead.qualified]
  → Owner books call:                      → assessment.scheduled
  → Owner decides not to proceed:          → lead.disqualified
```

```
[assessment.scheduled]
  → Call completed:                        → assessment.completed
  → No-show / rescheduled:                 → assessment.scheduled (stays)
  → Owner cancels:                         → lead.disqualified
```

```
[assessment.completed]
  → Owner triggers process-mapping-agent:  → mapping.in_progress
  → Owner decides not to proceed:          → closed.no_deal
```

### Mapping and scoping phase

```
[mapping.in_progress]
  → Process map written, ≥ 1 in-scope:     → mapping.complete
  → No in-scope processes found:           → mapping.complete + owner flag
```

```
[mapping.complete]
  → Owner triggers automation-scoping-agent: → scoping.in_progress
  → Owner reviews flags, decides no build: → closed.no_deal
```

```
[scoping.in_progress]
  → Scope of work + proposal draft written: → scoping.complete
```

```
[scoping.complete]
  → Owner reviews, sends proposal:         → proposal.sent
  → Owner decides not to send:             → closed.no_deal
```

### Proposal phase

```
[proposal.sent]
  → Client accepts:                        → proposal.accepted
  → Client declines:                       → proposal.declined
  → No response after [owner-defined SLA]: → owner follows up (stays proposal.sent)
```

```
[proposal.accepted]
  → Payment received + onboarding begins:  → onboarding.in_progress
  → Payment not received after [SLA]:      → owner chases (stays proposal.accepted)
```

```
[proposal.declined]
  → Terminal. Owner may re-engage later.
  → Re-engagement restarts at lead.qualified.
```

### Onboarding and build phase

```
[onboarding.in_progress]
  → n8n workspace created + credentials template populated: → build.ready
  → Credential collection stalled > 5 days: → owner escalates (stays onboarding.in_progress)
```

```
[build.ready]
  → Owner triggers workflow-builder-agent: → build.in_progress
```

```
[build.in_progress]
  → All workflows built and tested (build log complete): → build.complete
  → Node fails after 3 attempts:           → build.blocked
  → Missing credential discovered mid-build: → build.blocked
  → Missing tool in n8n discovered:        → build.blocked
  → Scope question requires owner decision: → build.blocked
```

```
[build.blocked]
  → Owner resolves blocker:                → build.in_progress (resumes)
  → Owner decides to descope the blocked item: → build.in_progress (reduced scope)
  → Blocker is unresolvable:              → closed.no_deal (rare)
```

```
[build.complete]
  → Owner triggers qa-agent:              → qa.in_progress
```

### QA and activation phase

```
[qa.in_progress]
  → Verdict: QA PASS:                     → qa.pass
  → Verdict: QA CONDITIONAL PASS:         → qa.pass (with conditions noted)
  → Verdict: QA FAIL:                     → qa.fail
```

```
[qa.fail]
  → Failures returned to workflow-builder-agent: → build.in_progress
  → (QA re-runs after fixes: → qa.in_progress)
```

```
[qa.pass]
  → Owner reviews QA report + activation checklist: → activation.pending
```

```
[activation.pending]
  → Owner activates all workflows in n8n: → live
  → Owner holds activation (e.g. client not ready): → stays activation.pending
```

```
[live]
  → status-update-agent begins cron reports: → live (ongoing)
  → Client requests change:               → owner scopes as new engagement
  → Client churns:                        → closed.post_delivery
```

---

## Owner Checkpoints

There are 4 points where the pipeline stops and requires an explicit
owner decision before it continues. No agent advances past these.

### Checkpoint 1 — Send the proposal

**Status at checkpoint:** `scoping.complete`

**Owner must:**
- Review `docs/clients/[client-slug]/scope-of-work.md` — check pricing,
  tier, ROI multiple, and owner flags
- Review `docs/clients/[client-slug]/proposal-draft.md` — check tone,
  accuracy of time estimates, API cost disclosure
- Verify ROI multiple ≥ 3× (flagged by scoping agent if thin)
- Decide whether to send, revise, or close the lead

**Advances to:** `proposal.sent` (owner sends the proposal)
**Closes at:** `closed.no_deal` (owner decides not to send)

---

### Checkpoint 2 — Start the build

**Status at checkpoint:** `build.ready`

**Owner must confirm all of the following:**
- Proposal accepted and payment received
- Client n8n workspace created by onboarding-automation
- Credentials template populated — every tool in scope has a pre-authed node
- Any COMPLIANCE FLAGs from the process map are resolved
- No blockers in the `scope-of-work.md` flags section

**Advances to:** `build.in_progress` (owner triggers workflow-builder-agent)
**Stays at:** `build.ready` until all items above are confirmed

---

### Checkpoint 3 — Approve the build for QA

**Status at checkpoint:** `build.complete`

**Owner must:**
- Review the BUILD COMPLETE summary from workflow-builder-agent
- Check the "Owner review items" in `docs/clients/[client-slug]/build-log.md`
- Optionally do a quick visual inspection in n8n before triggering QA

**Advances to:** `qa.in_progress` (owner triggers qa-agent)
**Holds at:** `build.complete` if owner has concerns — return to
workflow-builder-agent with specific instructions

Note: This checkpoint is lightweight. If the build log looks clean, the
owner can immediately trigger QA without a deep review — that's what QA
is for.

---

### Checkpoint 4 — Activate

**Status at checkpoint:** `activation.pending`

**Owner must:**
- Read `docs/clients/[client-slug]/qa-report.md` in full
- Complete every item in the owner activation checklist
- If QA CONDITIONAL PASS: verify all conditional fixes are complete
- Confirm with the client that they are ready for go-live (optional but
  recommended for first-time clients)
- Activate each workflow in n8n manually

**Advances to:** `live` (owner activates in n8n)
**No agent activates workflows under any circumstances.**

---

## Blocked State Handling

`build.blocked` is the only status where work stops mid-pipeline and
an agent is waiting for owner input.

### Blocked escalation protocol

When workflow-builder-agent sets `build.blocked`, it outputs:
```
BUILD BLOCKED — [client-slug]
Reason: [exact reason]
Owner action required: [specific question or action]
Build will resume at: [node name / workflow name]
```

**Owner response SLA:** Treat build blocks as high priority. Delayed
responses delay the client's delivery timeline directly.

**Resolution path:**
1. Owner resolves the blocker
2. Owner confirms resolution to workflow-builder-agent
3. Status returns to `build.in_progress`
4. Build resumes at the blocked node — does not restart from scratch

### Common blockers and resolutions

| Blocker | Resolution |
|---------|-----------|
| Missing credential | Owner provides via 1Password; client adds to n8n credential store |
| Tool not in n8n | Owner decides: webhook bridge, alternative tool, or descope |
| Node fails after 3 attempts | Owner reviews error; may require credential reset or API plan upgrade |
| Undefined branch logic | Owner defines the rule; builder implements |
| COMPLIANCE FLAG hit during build | Owner confirms legal scope in writing |
| Email/payment/delete node — trigger unclear | Owner confirms exact conditions in writing |

---

## Status in Practice (Airtable / ClickUp)

The canonical status lives in the client's Airtable record under the
field `project_status`. The same status should be reflected in the
corresponding ClickUp task.

**Airtable field:** `project_status` — single select, values match the
status registry above (e.g. `build.in_progress`)

**ClickUp task status mapping:**

| Project status | ClickUp status |
|----------------|---------------|
| `lead.*` | Lead |
| `assessment.*` | Assessment |
| `mapping.*`, `scoping.*` | Scoping |
| `proposal.*` | Proposal |
| `onboarding.*`, `build.ready` | Onboarding |
| `build.in_progress`, `build.blocked` | In Build |
| `build.complete`, `qa.*` | QA |
| `activation.pending` | Awaiting Activation |
| `live` | Live |
| `closed.*` | Closed |
