# SOP — Onboarding Automation
Version: 1.0
Last updated: 2026-03-15

## Purpose
Sets up all client project infrastructure on payment confirmation so the
workflow-builder-agent can start the build without any manual setup.

## When to Run
Triggered automatically by payment confirmation webhook. If the webhook
fails or was not configured, the owner triggers manually by invoking
onboarding-automation with the payment confirmation details.

## Prerequisites

- [ ] Payment received and recorded (Stripe or equivalent)
- [ ] `docs/clients/[client-slug]/scope-of-work.md` exists with a populated `Tools required:` section
- [ ] Client's email address is known and matches an Airtable lead record
- [ ] No raw API keys in any client document (scope, proposal, process map)
- [ ] Phoenix Automation n8n instance is accessible
- [ ] ClickUp project template exists in Phoenix Automation space

## Steps

1. **Payment webhook fires** — onboarding-automation receives the payload
   and extracts: client name, email, package, payment timestamp.

2. **Agent derives client slug** — lowercase company name, hyphens for spaces.
   Owner confirms slug is correct if ambiguous.

3. **Agent scans documents** — reads scope-of-work.md, proposal-draft.md,
   process-map.md for raw credential patterns. If found: STOP. Owner resolves
   before proceeding.

4. **Agent creates n8n workspace** — named `[client-slug]`. Workspace ID
   logged to Airtable.

5. **Agent creates credentials template** — one placeholder node per tool
   in `Tools required:`. Owner verifies the tools list is complete.

6. **Agent creates ClickUp project** — from standard template. Failure does
   not stop the run but is flagged in the readiness summary.

7. **Agent updates Airtable** — `project_status: onboarding.in_progress`,
   plus workspace ID and project ID.

8. **Agent writes readiness summary** — `docs/clients/[client-slug]/onboarding-readiness.md`.
   Track A section is complete. B-track and C-track require owner action.

9. **Owner sends credential instructions** — directs the client to connect
   each tool in n8n directly (never via chat or email).

10. **Client connects credentials** — client logs into each tool and
    authorises the n8n credential node. Timeline: 48 hours. Owner follows
    up if stalled. See stalled-onboarding protocol in onboarding-readiness-spec.md.

11. **Owner tests credentials in n8n** — each credential node must return
    green (authenticated, not expired). Failed nodes: owner notifies client
    to re-authorise.

12. **Owner completes Track B** — confirms B1 (payment), B2 (proposal
    accepted), B3 (owner flags resolved), B4 (compliance flags cleared),
    B5 (no credentials in conversation), B6 (scope final).

13. **Owner triggers workflow-builder-agent** — all 12 conditions confirmed.

## Expected Outputs

- `[client-slug]` project folder in Phoenix Automation n8n instance
- `[client-slug]-credentials-template` workflow with placeholder nodes
- ClickUp project created and visible in Phoenix Automation space
- Airtable record updated: `project_status: onboarding.in_progress`
- `docs/clients/[client-slug]/onboarding-readiness.md` with Track A complete

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| scope-of-work.md missing | Agent stops at Step 3 | Run automation-scoping-agent first |
| Raw credential found in doc | Agent outputs ONBOARDING BLOCKED | Owner locates and removes the credential, re-runs |
| n8n API unavailable | Workspace creation fails | Check n8n instance health, verify API key |
| Tool has no n8n integration | Marked UNRESOLVED in readiness summary | Owner decides: webhook bridge, alternative tool, or descope (DL-8) |
| ClickUp creation fails | Flagged in readiness summary | Owner creates project manually, records ID in Airtable |
| Client credentials stalled > 48 hrs | C1 not confirmed at Checkpoint 2 | Owner follows stalled-onboarding protocol in onboarding-readiness-spec.md |
| Client sends raw key via email/chat | C2 fails | Owner tells client to revoke key, generate new one, connect directly in n8n |

## Owner Confirmation Points

At **Checkpoint 2**, owner must explicitly confirm all 12 conditions before
triggering workflow-builder-agent:

**Track B (owner confirms):**
□ B1: Payment received and recorded
□ B2: Proposal accepted in writing
□ B3: All owner flags in scope-of-work.md resolved or marked [RESOLVED]
□ B4: All compliance flags cleared or processes descoped
□ B5: No raw credentials in any conversation or document
□ B6: Scope is final — no pending client changes

**Track C (client acted, owner confirms):**
□ C1: All credential nodes in `[client-slug]-credentials-template` tested green
□ C2: Client connected tools directly in n8n — no keys received via chat or email

All 12 must be checked. Partial confirmation does not unblock the build.
