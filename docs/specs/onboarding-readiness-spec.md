# Onboarding Readiness Specification
Version: 1.0
Last updated: 2026-03-15

Defines precisely what "build.ready" means. Partitions every readiness
condition by who is responsible and how it is verified. Serves as the
canonical checklist for Owner Checkpoint 2 before workflow-builder-agent
is triggered.

Cross-references:
- Dependency pre-conditions → `docs/specs/workflow-dependency-spec.md` Stage 6
- H3 acceptance criteria → `docs/workflows/handoff-spec.md`
- Build pre-conditions → `docs/specs/workflow-dependency-spec.md` Stage 7

---

## Why This Spec Exists

The handoff-spec.md (H3) lists acceptance criteria for starting a build.
What was missing is a clear partition of those criteria into three tracks:

1. What **onboarding-automation** produces (agent-verifiable)
2. What the **owner** confirms (owner-verifiable)
3. What the **client** must have done (client-interactive, owner confirms on their behalf)

Without this partition, checklist items are mixed together and it is
unclear who is responsible for unresolved items or how to unblock them.

---

## The Three Tracks

### Track A — Agent-verifiable
onboarding-automation can verify these by checking file system or n8n API.
If these are not present, onboarding-automation stops with a clear error.

### Track B — Owner-verifiable
Owner confirms these based on external communications or judgment.
An agent cannot verify them. They are confirmed by the owner at Checkpoint 2.

### Track C — Client-interactive
The client must have taken an action (typically: connected their accounts,
provided credentials). The owner confirms the client has done this.
No agent can verify this directly.

---

## Readiness Checklist

The following table is the Checkpoint 2 checklist. All 12 conditions must
be true before workflow-builder-agent is triggered. Status in `build.ready`
means every item is checked.

### Track A — Agent-verifiable (onboarding-automation confirms)

| # | Condition | How verified | Blocking? |
|---|-----------|-------------|-----------|
| A1 | `docs/clients/[client-slug]/scope-of-work.md` exists and has a `Tools required:` section with at least one tool listed | File system read | Yes |
| A2 | Client n8n workspace/project folder exists | n8n API: list workspaces | Yes |
| A3 | Credentials template workflow exists in the client's n8n workspace | n8n API: list workflows in client workspace, match by name convention `[client-slug]-credentials-template` | Yes |
| A4 | The credentials template contains a node for every tool listed in `Tools required:` in scope-of-work.md | n8n API: read template nodes, compare against scope tool list | Yes |
| A5 | No raw API keys, tokens, or passwords appear in scope-of-work.md, proposal-draft.md, or process-map.md | File content scan | Yes |

### Track B — Owner-verifiable (owner confirms at Checkpoint 2)

| # | Condition | How confirmed | Blocking? |
|---|-----------|--------------|-----------|
| B1 | Payment received and recorded (invoice paid, Stripe payment confirmed, or bank transfer received) | Owner checks payment record | Yes |
| B2 | Proposal accepted (client sent written confirmation — email, reply, signed doc) | Owner confirms acceptance record exists | Yes |
| B3 | All owner flags in scope-of-work.md are resolved | Owner reads `Owner flags:` section — empty or each item marked `[RESOLVED]` | Yes |
| B4 | All compliance flags from process-map.md are cleared (or those processes descoped) | Owner checks `⚠️ COMPLIANCE FLAG` items — each has `Compliance clearance:` record or is removed from scope | Yes |
| B5 | No raw credentials have appeared in any conversation or document during this engagement | Owner confirms no credentials were shared in chat, email, or documents | Yes |
| B6 | Scope of work is final — no pending changes requested by client | Owner confirms client is satisfied with the agreed scope | Yes |

### Track C — Client-interactive (client has acted, owner confirms)

| # | Condition | What the client must have done | Owner confirmation method | Blocking? |
|---|-----------|-------------------------------|--------------------------|-----------|
| C1 | Every tool in scope-of-work.md has a live, working credential connected in the client's n8n workspace | Client logged into each tool and authorised the n8n credential | Owner tests each credential node in n8n — all return green (authenticated, not expired) | Yes |
| C2 | Client has not shared raw credentials with owner or any agent | Client used n8n's OAuth/API key flow directly (never pasted keys into chat) | Owner confirms no keys were received | Yes |

---

## Onboarding Sequence

Onboarding runs in this order. Do not trigger workflow-builder-agent
until the full sequence is complete.

```
Step 1: Payment confirmed (B1)
        │
        ▼
Step 2: onboarding-automation reads scope-of-work.md (A1)
        Extracts: client-slug, tools required list
        │
        ▼
Step 3: onboarding-automation creates client n8n workspace (A2)
        Naming convention: [client-slug] project folder in n8n
        │
        ▼
Step 4: onboarding-automation creates credentials template workflow (A3)
        Template name: [client-slug]-credentials-template
        Adds one node placeholder per tool in scope (A4)
        │
        ▼
Step 5: Owner sends credential setup instructions to client
        Instructions include: which tools to connect, how to use n8n
        credential store, NOT to share keys via chat or email
        │
        ▼
Step 6: Client connects each tool in n8n (C1, C2)
        Timeline: client has up to 48 hours (owner follows up if stalled)
        │
        ▼
Step 7: Owner tests all credentials in n8n (C1 confirmed)
        Each credential node returns green. If any fail, owner notifies client.
        │
        ▼
Step 8: Owner reviews all B-track conditions (B1–B6)
        │
        ▼
Step 9: Owner confirms status = build.ready
        Triggers workflow-builder-agent
```

---

## Credential Security Rules

These rules apply at all times during onboarding. They are not optional.

**Rule 1: Credentials travel only through n8n.**
The client connects their tools directly in n8n using OAuth or the
n8n API key field. The client never pastes a key into chat, email,
Notion, or any shared document.

**Rule 2: Owner never holds raw credentials.**
If a client sends a raw API key to the owner (email, Slack, etc.),
the owner must:
1. Tell the client to revoke that key immediately
2. Ask the client to generate a new key and enter it directly in n8n
3. Not store, copy, or forward the key

**Rule 3: No test credentials in production.**
If the owner or agent used a test credential during setup, it must
be replaced with the production credential before workflow-builder-agent
starts. A test credential in the credentials template at build time
is a blocking condition (see A4 — the node exists, but C1 must also
be true: the credential is live and authenticated).

---

## Stalled Onboarding

**If client has not connected credentials within 48 hours:**

Owner sends a reminder: provide specific instructions, offer a 10-minute
screen-share if needed. This is a client interaction — no agent handles it.

**If client cannot connect a tool (no n8n integration):**

Owner applies DL-8 (see `decision-logic-spec.md`): choose webhook bridge,
alternative tool, or descope. This changes the scope-of-work.md, which
must be updated and re-confirmed with the client before onboarding continues.

**If client has not connected credentials after 5 business days:**

Owner marks status as `onboarding.stalled` in Airtable. Owner decides:
escalate with client, hold the project, or close. There is no automated
escalation — this is a relationship decision.

---

## Readiness Verification Output

When all 12 conditions are confirmed, onboarding-automation writes a
readiness summary:

```
ONBOARDING COMPLETE — [Client Company Name]
Date: [date]

Track A — Agent-verified:
✅ A1: scope-of-work.md exists with tools list
✅ A2: n8n workspace created ([client-slug])
✅ A3: Credentials template created ([client-slug]-credentials-template)
✅ A4: Template contains nodes for: [tool1], [tool2], [tool3]
✅ A5: No raw credentials found in client documents

Track B — Owner-confirmed:
□ B1: Payment received
□ B2: Proposal accepted
□ B3: Owner flags resolved
□ B4: Compliance flags cleared
□ B5: No credentials in conversation
□ B6: Scope finalised

Track C — Client action confirmed:
□ C1: All credentials tested green: [tool1], [tool2], [tool3]
□ C2: Client did not share raw keys

Status: PENDING OWNER CONFIRMATION
Owner: confirm B1–B6 and C1–C2, then trigger workflow-builder-agent.
```

Owner fills in the B and C checkboxes at Checkpoint 2. All 12 must be
checked before the build starts.

---

## What onboarding-automation Does NOT Do

- Does not receive or store credentials
- Does not test credential validity (it adds placeholder nodes — the
  owner tests credential connections after the client has connected them)
- Does not send emails to the client (owner manages the client relationship)
- Does not activate any workflow
- Does not modify scope-of-work.md
- Does not proceed past A-track verification if any A-track condition fails
