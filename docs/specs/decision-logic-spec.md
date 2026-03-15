# Decision Logic Specification
Version: 1.0
Last updated: 2026-03-15

Formalises every branching decision point in the Phoenix Automation pipeline.
Each decision tree defines: inputs, the decision rule, possible outcomes, and
who makes the call.

Cross-references:
- Pipeline structure → `docs/specs/workflow-dependency-spec.md`
- Status transitions → `docs/workflows/project-status-spec.md`
- Handoff gates → `docs/workflows/handoff-spec.md`

---

## Why This Spec Exists

The existing workflow documents describe what happens in the normal path.
What was missing is an explicit treatment of every fork: the conditions
that route to each branch, who has authority to override, and what the
default is when conditions are ambiguous.

Without this, agents apply inconsistent logic in edge cases, owners make
ad-hoc decisions that should be consistent, and the system accumulates
undocumented exceptions.

---

## Decision Tags

| Tag | Meaning |
|-----|---------|
| `[AUTO]` | Agent decides based on rules in this spec — no owner input needed |
| `[OWNER]` | Owner makes this call — agent presents options, does not decide |
| `[OWNER-OVERRIDE]` | Default is AUTO, but owner can override with explicit instruction |

---

## DL-1: Lead Routing — Chatbot Mode

**Agent:** lead-qualification-agent (Mode A)
**Trigger:** Chatbot conversation concludes (3 questions answered)
**Decision: HOT or COLD**

### Scoring rules `[AUTO]`

Score 1 point for each of the following present in the conversation:

| Signal | Points |
|--------|--------|
| Business type is in target segment (e-commerce, professional services, healthcare, logistics, property management) | 1 |
| Team size ≥ 3 and ≤ 200 | 1 |
| Manual task is repetitive AND time-consuming (owner says it weekly or daily) | 1 |
| Owner expresses urgency or frustration ("this is killing us", "we do this 50 times a week") | 1 |

### Routing decision `[AUTO]`

| Score | Outcome | Agent action |
|-------|---------|-------------|
| 3–4 | HOT | Send Calendly link, log as `lead.qualified` |
| 2 | BORDERLINE | Ask one clarifying question (see DL-1a), then re-score |
| 0–1 | COLD | Soft close, log as `lead.disqualified` |

### DL-1a: Borderline clarifying question `[AUTO]`

Agent asks: *"Just so I can give you the most relevant information — roughly
how many hours per week does your team spend on [the task they mentioned]?"*

- If answer suggests ≥ 5 hours/week → score bumps to HOT → send Calendly
- If answer suggests < 5 hours/week → remains COLD → soft close

### Owner override `[OWNER-OVERRIDE]`

Owner may manually flag any disqualified lead as qualified by updating
`lead_score_grade` in Airtable to `OVERRIDE-PROCEED`. This must be set
before the lead can progress to Stage 3. An override without this Airtable
flag cannot be processed by process-mapping-agent.

---

## DL-2: Lead Routing — Typeform Mode

**Agent:** lead-qualification-agent (Mode B)
**Trigger:** Typeform submission received via n8n webhook
**Decision: HIGH / MEDIUM / LOW grade**

### Scoring rules `[AUTO]`

Score each dimension 0–2:

| Dimension | 0 | 1 | 2 |
|-----------|---|---|---|
| Industry fit | Out of ICP | Adjacent | Core ICP segment |
| Team size | < 3 or > 200 | 3–10 | 10–200 |
| Pain specificity | Vague | Named pain | Named + quantified (hours/week) |
| Time lost | "Not sure" | < 5 hrs/week | ≥ 5 hrs/week |

### Grade thresholds `[AUTO]`

| Total score | Grade | Agent action |
|-------------|-------|-------------|
| 6–8 | HIGH | Write pre-call brief → email owner alert |
| 3–5 | MEDIUM | Write pre-call brief → no owner alert (owner sees in Airtable) |
| 0–2 | LOW | Log grade → no brief → owner must override to proceed |

### Owner override for LOW `[OWNER-OVERRIDE]`

Owner may proceed with a LOW-grade lead (e.g. referral from a valued contact).
Requirement: set Airtable `lead_score_grade = OVERRIDE-PROCEED` and add a note
explaining the override. Without this, process-mapping-agent blocks on DL-3.

---

## DL-3: Assessment Call Exit Decision

**Decision-maker:** Owner
**Trigger:** Assessment call ends
**Decision: PROCEED TO MAPPING or CLOSE**

### Rules `[OWNER]`

Owner applies the following test after the call:

| Question | Yes path | No path |
|----------|---------|---------|
| Did the prospect describe at least one repeatable manual process? | Continue | → `closed.no_deal` |
| Is the process automatable with n8n + standard integrations? | Continue | → `closed.no_deal` (or refer out) |
| Is the prospect willing to own their credentials? | Continue | → `closed.no_deal` |
| Does the engagement feel like it would take ≤ 1 build week? | Continue | Flag for senior scope review |

If all four are Yes → owner pastes notes into process-mapping-agent.
If any is No → owner closes the lead (`closed.no_deal`) or refers out.

There is no agent involvement in this decision. Owner judgment is final.

---

## DL-4: Complexity Rating — Per-Process

**Agent:** process-mapping-agent
**Decision: LOW / MEDIUM / HIGH / OUT OF SCOPE**

### Rating rules `[AUTO]`

Rate each process on four dimensions (0–2 each), max score 8:

| Dimension | 0 | 1 | 2 |
|-----------|---|---|---|
| Repeatability | Rare / irregular | Weekly | Daily or per-transaction |
| Rule-based logic | Requires human judgment | Mostly rule-based | Fully rule-based |
| Frequency / volume | < 5 instances/week | 5–20/week | > 20/week |
| Multi-system | 1 tool | 2 tools | 3+ tools |

**Complexity rating from score:**

| Score | Rating |
|-------|--------|
| 0–3 | LOW |
| 4–5 | MEDIUM |
| 6–7 | HIGH |
| 8 | HIGH (flag for scope clarification) |

**OUT OF SCOPE triggers (override all scores):**

A process is rated OUT OF SCOPE regardless of score if any of the
following are true:

- Requires a real-time phone call or video interaction
- Requires licensed professional judgment (legal, medical, financial advice)
- Requires physical action (shipping, in-person verification)
- Data is subject to HIPAA, SOX, or PCI-DSS and the client has not
  confirmed a compliant data-sharing path
- The primary tool required has no n8n integration and no viable webhook bridge

**COMPLIANCE FLAG (does not set OUT OF SCOPE but blocks the build):**

Flag any process where automation touches:
- Patient health data
- Financial transaction records
- Personally identifiable information shared with a third party
- Legal document generation or signature collection

A compliance-flagged process can only proceed after the owner explicitly
confirms the scope in writing (see DL-7).

---

## DL-5: Pricing Tier Decision

**Agent:** automation-scoping-agent
**Decision: Starter ($1,500–$3,000) or Growth ($3,000–$7,000)**

### Tier selection rules `[AUTO]`

| Condition | Tier |
|-----------|------|
| 1–2 in-scope processes, all LOW or MEDIUM complexity | Starter |
| 1–2 in-scope processes with ≥ 1 HIGH complexity | Growth |
| 3–5 in-scope processes, any complexity | Growth |
| > 5 in-scope processes | Owner must split into phases before scoping |

### ROI validation rule `[AUTO]`

Calculate: `(total annual hours saved) × $25 ÷ quoted price`

- If result ≥ 3.0 → ROI multiple is valid → proceed
- If result < 3.0 → agent flags this in scope-of-work.md under `Owner flags:`
  and does not proceed until owner reviews the pricing decision

### Price-setting within tier `[OWNER]`

The agent selects the tier. The owner sets the exact price within the
tier range. The proposal-draft.md is written with a placeholder:
`[OWNER TO SET FINAL PRICE: $X,XXX–$X,XXX]`. The owner fills this
before sending the proposal.

---

## DL-6: Proposal Send Decision

**Decision-maker:** Owner
**Trigger:** scope-of-work.md and proposal-draft.md exist
**Decision: SEND AS-IS / REVISE AND SEND / DO NOT SEND**

### Rules `[OWNER]`

Owner checks:

| Check | Action if fails |
|-------|----------------|
| ROI multiple ≥ 3.0 | Revise scope or pricing before sending |
| No unresolved owner flags in scope-of-work.md | Resolve each flag first |
| API cost estimate is present and accurate | Update the estimate |
| All owner flags from compliance review cleared | Clear or remove the process from scope |
| Price is within tier range and set (not placeholder) | Set the final price |

If all checks pass → owner sends the proposal.
If any fail → owner revises before sending or decides not to send.

The agent cannot send the proposal. It produces the draft. Owner acts on it.

---

## DL-7: Compliance Flag Clearance

**Decision-maker:** Owner
**Trigger:** Any process in scope-of-work.md has a `⚠️ COMPLIANCE FLAG`
**Decision: CLEAR / DESCOPE / REFER OUT**

### Rules `[OWNER]`

For each flagged process, the owner must choose one:

| Option | Condition | Action |
|--------|-----------|--------|
| CLEAR | Owner has confirmed legal/compliance scope in writing | Record the confirmation in scope-of-work.md under `Compliance clearance:` |
| DESCOPE | Process is too risky to automate | Remove from scope, revise pricing |
| REFER OUT | Requires specialist (compliance consultant, lawyer) | Close this scope item, advise client |

workflow-builder-agent will not build any compliance-flagged process
until a `Compliance clearance:` record exists in scope-of-work.md for
that specific process. This is enforced by P7 pre-conditions (see
`workflow-dependency-spec.md`).

---

## DL-8: Build Blocker Resolution

**Decision-maker:** Depends on blocker type (see below)
**Trigger:** workflow-builder-agent outputs `BUILD BLOCKED`

### Blocker resolution authority

| Blocker type | Who decides | Resolution path |
|-------------|------------|----------------|
| Missing credential | `[CLIENT]` provides, `[OWNER]` adds to n8n template | Owner supplies credential, client adds to n8n |
| Tool not in n8n | `[OWNER]` | Choose: (a) webhook bridge, (b) alternative tool, (c) descope |
| Node fails after 3 attempts | `[OWNER]` | Review exact error, reset credential, or escalate to n8n support |
| Branch logic undefined | `[OWNER]` | Define the rule in writing in scope-of-work.md |
| Compliance flag reached during build | `[OWNER]` | Apply DL-7 before build can resume |
| Email/payment/delete trigger unclear | `[OWNER]` | Define exact trigger condition in writing |

**Rule:** The agent never resolves a blocker by guessing. Every blocker
surfaces to the owner with the exact error and specific question. The
owner provides a written resolution before the build resumes.

### Build resume rule `[AUTO]`

After owner resolution, the build resumes at the specific blocked node.
It does not restart from the beginning. The build log records the blocker,
the resolution, and the resume point.

---

## DL-9: QA Verdict Decision

**Agent:** qa-agent
**Decision: QA PASS / QA CONDITIONAL PASS / QA FAIL**

### Verdict rules `[AUTO]`

| Condition | Verdict |
|-----------|---------|
| 0 FAILs and 0 unacceptable SKIPs | QA PASS |
| 1–2 FAILs, all minor (not security, not scope) | QA CONDITIONAL PASS |
| Any FAIL on items 15, 16, or 17 (credential/security checks) | QA FAIL — immediate |
| Any FAIL on items 19, 20, or 21 (scope checks) | QA FAIL — immediate |
| FAIL on item 3 (trigger does not fire) | QA FAIL — immediate |
| FAIL on item 10 (error workflow not connected) | QA FAIL — immediate |
| 3 or more FAILs of any type | QA FAIL |

**Unacceptable SKIP rule `[AUTO]`:**
Items 3, 10, 15, 16, 17 cannot be SKIPped. If the agent cannot test
these (e.g. no access to n8n API), it must output `QA BLOCKED` and
stop — it does not issue a PASS with these items skipped.

### QA FAIL return path `[AUTO]`

Agent outputs exact failure list to workflow-builder-agent. Builder fixes
only the listed failures. QA re-runs the full 25-item checklist after fixes
are confirmed — no partial re-runs.

### Repeated failure escalation `[OWNER]`

If QA fails 2 consecutive times on the same items, the agent flags this
in the qa-report.md: `ESCALATION: QA failed twice on [item N] — owner
input required before next build attempt.` Owner must review before
build resumes.

---

## DL-10: Activation Decision

**Decision-maker:** Owner
**Trigger:** QA PASS or QA CONDITIONAL PASS issued
**Decision: ACTIVATE NOW / HOLD**

### Rules `[OWNER]`

Owner may choose to hold activation even after QA PASS. Valid hold reasons:

- Client has not confirmed they are ready to go live
- Client's team needs training before live workflows process real data
- A dependency outside the build scope is not ready (e.g. the client's
  CRM hasn't been migrated yet)

**Hold condition:** Status stays `activation.pending`. No expiry. Owner
activates when ready.

**Activation rule — always human `[OWNER]`:**
No agent activates workflows. Ever. The owner opens n8n and clicks
Activate for each workflow individually. This rule has no exceptions
and cannot be automated.

---

## Decision Override Log

When an owner overrides an `[AUTO]` decision, they must record it.
Format for recording in the relevant client document or Airtable:

```
OWNER OVERRIDE — [decision reference e.g. DL-2]
Date: [date]
Default decision: [what the agent would have decided]
Override decision: [what the owner decided instead]
Reason: [brief justification]
```

This creates an audit trail and prevents future agents from re-applying
the auto-decision to the same case.
