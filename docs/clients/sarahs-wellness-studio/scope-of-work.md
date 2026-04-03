# Scope of Work — Sarah's Wellness Studio
**Client:** Sarah Chen | sarah@sarahswellness.com
**Client slug:** sarahs-wellness-studio
**Prepared by:** automation-scoping-agent
**Date:** 2026-04-03
**Status:** APPROVED — ready for build

---

## Engagement Summary

**Service tier:** Starter Build — $2,400
**Delivery timeline:** 5 business days from credential receipt
**Builder:** workflow-builder-agent (Claude Code + n8n-MCP)

---

## What We're Building

### Automation 1 — Application Triage (Priority 1)

**Trigger:** New Typeform submission (webhook: POST /sarah-application)

**Flow:**
1. Receive Typeform payload — extract: applicant_name, email, health_goals, commitment_level, referral_source, budget_signal (from form field)
2. Claude scores the application against Sarah's ICP:
   - Health goals are specific and aligned with program outcomes
   - Applicant indicates 12-week commitment availability
   - Budget signal: no red flags (not asking if there's a payment plan for a $2,400 program)
   - Overall: ACCEPT / REJECT / WAITLIST
3. Route:
   - **ACCEPT:** Send personalised acceptance email → log to Notion CRM (status: accepted, awaiting_payment) → send Stripe payment link ($2,400)
   - **REJECT:** Send warm rejection email with encouragement to reapply in 3 months → log to Notion CRM (status: not_a_fit)
   - **WAITLIST:** Send waitlist confirmation email → log to Notion CRM (status: waitlisted)

**Acceptance email content:**
- Personalised opening (reference their stated health goal)
- Program overview (3 sentences max)
- Stripe payment link
- What happens after payment (onboarding sequence preview)
- Sarah's signature

**Rejection email content:**
- Warm, non-dismissive tone
- Specific reason (where possible, e.g. "the timing doesn't seem right")
- Invitation to reapply
- Sarah's signature

---

### Automation 2 — Post-Payment Onboarding (Priority 2)

**Trigger:** Stripe payment confirmed (webhook: POST /sarah-payment-confirmed, event: payment_intent.succeeded)

**Flow:**
1. Receive Stripe payload — extract: customer email, amount, payment_id
2. Look up client in Notion CRM by email → confirm status = accepted, awaiting_payment
3. Update Notion CRM: status → active_client, payment_date, payment_id
4. Send Day 0 welcome email:
   - Program start date (8 days from payment)
   - Login link to course platform (placeholder URL from Sarah)
   - Welcome PDF attachment (Sarah provides PDF URL)
   - "Your coach will be in touch in 24 hours" close
5. Send Day 1 onboarding email (24-hour delay):
   - Week 1 prep instructions
   - First coaching session booking link (Calendly)
   - Community/Slack group invite link

---

## Out of Scope (Phase 2)

- Weekly check-in reminder emails
- Automated payment failure follow-up
- Progress tracking notifications
- Referral program

---

## Deliverables

| Deliverable | Format |
|-------------|--------|
| Application Triage workflow | n8n workflow in Sarah's account |
| Post-Payment Onboarding workflow | n8n workflow in Sarah's account |
| Typeform webhook setup guide | 1-page PDF |
| Stripe webhook setup guide | 1-page PDF |
| Test report (QA pass) | qa-report.md |

---

## Prerequisites Before Build Can Start

Sarah must provide (via credential submission form):
- [ ] n8n account URL (sign up at n8n.io → create API key named "Phoenix Automation")
- [ ] n8n API key
- [ ] Notion integration token (Settings → Integrations → New integration)
- [ ] Notion database ID for client CRM
- [ ] Stripe webhook secret (Developers → Webhooks → Add endpoint)
- [ ] Gmail app password for sarah@sarahswellness.com
- [ ] Stripe payment link URL for $2,400 program
- [ ] Welcome PDF URL (hosted link or Google Drive)
- [ ] Calendly link for first coaching session
- [ ] Slack/community invite link (or placeholder if not ready)

---

## How workflow-builder-agent Handles This

When Kai runs `workflow-builder-agent` in Claude Code with this scope:

1. **Phase A — Plan:** Agent reads this scope-of-work.md + verifies Sarah's n8n credentials in Airtable (`n8n_api_key`, `n8n_workspace_id` fields on Clients table record for `sarahs-wellness-studio`)

2. **Phase B — Build node by node:**
   - Creates Typeform webhook trigger node in Sarah's n8n
   - Adds HTTP Request node → Anthropic API (Claude scoring prompt tailored to Sarah's ICP)
   - Adds Code node → parse Claude JSON response (ACCEPT/REJECT/WAITLIST)
   - Adds Switch node → route by decision
   - Adds Email Send nodes (pa-smtp or Gmail credential) for each route
   - Adds Notion node → create/update record in her CRM database
   - Adds Set node → format Stripe payment link email

3. **Phase C — E2E test:**
   - Submits test Typeform payload → verifies correct routing
   - Tests acceptance path → confirms email + Notion record created
   - Tests rejection path → confirms rejection email sent

4. **Phase D — Error handling:** Connects workflow to Sarah's error handler (or creates a simple one if she doesn't have it)

5. **Phase E — Document:** Writes build-log.md + qa-report.md to docs/clients/sarahs-wellness-studio/

---

## API Cost Disclosure

| Service | Usage | Estimated cost |
|---------|-------|----------------|
| Anthropic Claude (application scoring) | ~500 tokens per application × 20 applications/week | ~$0.15/week |
| n8n Cloud (Sarah's account) | Starter plan sufficient | $20/month |
| **Total ongoing cost** | | **~$21/month** |

One-time build cost to Sarah: $2,400 (Starter Build tier)
