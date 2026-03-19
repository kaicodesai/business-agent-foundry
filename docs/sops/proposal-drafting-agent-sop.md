# SOP — Proposal Drafting Agent
Version: 1.0
Last updated: 2026-03-15

## Purpose
Produces a complete, send-ready client proposal within one Claude Code run
after an assessment call — no manual drafting required from the owner.

## When to Run
Within 24 hours of completing an assessment call where at least one
automation opportunity was identified. Do not run if the call produced no
concrete automation opportunities.

## Prerequisites

- [ ] Assessment call is complete and call notes are captured
- [ ] Call notes identify at least one repeatable manual process
- [ ] Client company name is identifiable from the notes
- [ ] process-mapping-agent has already run (recommended — use process-map.md
  if available; proceed from notes only if not)

## Steps

1. **Owner captures call notes** — bullets, prose, or mixed. Include: what
   the company does, their manual pain points, specific processes mentioned,
   rough time estimates if given, any compliance-sensitive areas.

2. **Owner invokes proposal-drafting-agent** — paste call notes into
   Claude Code. The agent identifies the client, reads any existing
   process-map.md, and fetches Airtable context if available.

3. **Agent drafts the proposal** — structures automation opportunities,
   applies pricing tier logic (DL-5), calculates ROI multiple, writes
   timeline, and flags anything the owner must resolve before sending.

4. **Agent writes file** — `docs/clients/[client-slug]/proposal-draft.md`

5. **Agent outputs terminal summary** — lists automations found, pricing
   tier, ROI multiple, and owner review items.

6. **Owner reads the draft** — checks: is the framing accurate? Does the
   client's language come through? Is the ROI defensible?

7. **Owner resolves review items** — sets final price, clears any compliance
   flags, confirms timeline, confirms API cost estimate is accurate.

8. **Owner sends the proposal** — by email, Notion share, or PDF export.
   Never auto-send.

## Expected Outputs

- `docs/clients/[client-slug]/proposal-draft.md` — complete proposal ready
  for owner review
- Terminal summary — automations count, pricing tier, ROI multiple, owner
  review items list

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| No automations identifiable | Agent outputs DRAFT BLOCKED | Owner adds more specific notes about processes discussed |
| process-map.md missing | Agent proceeds from notes only | Run process-mapping-agent first for richer output |
| ROI multiple < 3.0× | Flagged in owner review items | Owner revises scope (add more processes) or reconsiders pricing tier |
| Compliance flag raised | Listed in owner review items | Owner applies DL-7: CLEAR, DESCOPE, or REFER OUT |
| Client company name ambiguous | Agent cannot derive slug | Owner specifies company name and slug before running |

## Owner Confirmation Points

Before sending the proposal, owner must confirm:

□ Final price is set (placeholder replaced with exact dollar amount)
□ Timeline estimates are accurate and achievable
□ All compliance flags are cleared or those processes are removed from scope
□ ROI multiple is ≥ 3.0× at the set price
□ API cost estimate ($50–$300/mo typical) is disclosed and accurate
□ Proposal tone matches the client — it reads like you wrote it, not a template
