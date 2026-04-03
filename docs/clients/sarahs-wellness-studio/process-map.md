# Process Map — Sarah's Wellness Studio
**Client:** Sarah Chen | sarah@sarahswellness.com
**Prepared by:** process-mapping-agent
**Date:** 2026-04-03
**Status:** Ready for scoping

---

## Assessment Call Notes (Raw)

> Sarah runs an online wellness coaching program — 12-week transformation course, $2,400/client.
> She has 3 intake steps: (1) applicant fills a Typeform with health history + goals, (2) Sarah manually reviews each application (~20 minutes each), (3) she emails accepted clients a welcome PDF + Stripe payment link.
> She gets 15–25 applications/week. Rejection emails take another 10 minutes each.
> She also manually adds accepted clients to her Notion CRM and sends them an onboarding checklist via email.
> Team: just Sarah + 1 VA. The VA does social media, not admin.
> Biggest pain: "I spend my Sunday afternoons doing paperwork instead of prep for the week."
> She's tried Zapier but gave up after the trigger kept missing submissions.

---

## Process Map

### Process 1 — Application Intake & Triage (AUTOMATE — Priority 1)

| Step | Current State | Time | Frequency |
|------|--------------|------|-----------|
| Applicant submits Typeform | Automatic | 0 min | 15–25x/week |
| Sarah reads application | Manual | 20 min each | 15–25x/week |
| Sarah decides accept/reject | Manual | 5 min each | 15–25x/week |
| **Total manual time** | | **~375–625 min/week** | |

**Automation candidate:** Typeform webhook → Claude reads application → scores fit against Sarah's ICP criteria (health goals, commitment level, budget signals) → auto-sends acceptance or rejection email with personalised note → logs to Notion/Airtable CRM

**Estimated time saved:** 5–8 hours/week
**ROI at Sarah's rate ($150/hr coaching):** $750–$1,200/week saved

---

### Process 2 — Accepted Client Onboarding (AUTOMATE — Priority 2)

| Step | Current State | Time | Frequency |
|------|--------------|------|-----------|
| Email welcome PDF + Stripe link | Manual | 10 min each | 8–12 accepted/week |
| Add to Notion CRM | Manual | 5 min each | 8–12 accepted/week |
| Send onboarding checklist | Manual | 5 min each | 8–12 accepted/week |
| **Total manual time** | | **~160–240 min/week** | |

**Automation candidate:** On acceptance trigger → send personalised welcome email with Stripe payment link + program PDF → on payment confirmed → add to Notion CRM → send Day 1 onboarding sequence email

**Estimated time saved:** 2.5–4 hours/week

---

### Process 3 — Weekly Check-in Reminders (DEFER — Phase 2)

Manual weekly emails to active clients. Low-complexity, medium-value. Defer to Phase 2.

---

## Recommended Build Order

1. **Application triage automation** (Typeform → Claude → Accept/Reject email → CRM log)
2. **Accepted client onboarding** (Welcome email → Stripe → Onboarding sequence)

**Combined estimated build time:** 3–4 hours
**Total estimated time saved for Sarah:** 7–12 hours/week
**Payback period at $2,400 Starter Build:** < 2 weeks

---

## Tool Inventory

| Tool | Already Has? | Notes |
|------|-------------|-------|
| Typeform | ✅ Yes | Active intake form at sarahswellness.com/apply |
| Stripe | ✅ Yes | Used for payment collection |
| Notion | ✅ Yes | CRM + client tracker |
| n8n | ❌ No | Will need to sign up (Option A — own account) |
| Gmail | ✅ Yes | sarah@sarahswellness.com |

---

## Complexity Rating

**Overall: LOW-MEDIUM**
- Typeform → n8n webhook: standard, well-documented
- Claude scoring: straightforward prompt, deterministic output format
- Email sending: SMTP via n8n, Sarah's Gmail
- Notion API: well-supported in n8n (native node)
- Stripe webhook: standard payment confirmation trigger

No custom code beyond Claude prompt and response parsing.
