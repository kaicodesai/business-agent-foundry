# Assumptions & Gaps — Phoenix Automation

> Extracted from business-blueprint.json · 2026-03-13

5 assumptions (0 validated), 10 gaps (1 blocking). Every assumption is a risk until tested. The blocking gap must be resolved before the site can generate revenue.

---

## Blocking Gaps

> **CTA buttons not connected to Calendly — site cannot generate revenue**
> Severity: BLOCKING · Owner: Founder · Resolution: Connect both 'Get Free Assessment' and 'Schedule Your Free Assessment' buttons to a live Calendly booking page. 15-minute fix. Do today.

---

## Assumptions

| # | Assumption | Risk if Wrong | Validation Method | Validated? |
|---|-----------|---------------|-------------------|------------|
| 1 | The free assessment + same-call proposal model converts at > 30% to paid builds | Revenue pipeline collapses — all effort on assessments yields no revenue and burns founder time | Track assessment-to-proposal and proposal-to-paid conversion over first 10 assessments; adjust offer if rate is below 20% | No |
| 2 | Claude Code + n8n-MCP reliably builds production-grade client workflows in under 1 hour | Build times stay at 3–5 hours — core operational advantage disappears, pricing model breaks | Run 5 test builds across different workflow types (simple trigger-action, multi-step, AI-integrated) before signing first client | No |
| 3 | SMB clients will accept the credential ownership model without friction during onboarding | Clients object to managing their own API accounts — onboarding drags and trust breaks early | Include credential handoff script in first 3 proposals; track objection rate; prepare 15-minute guided setup if needed | No |
| 4 | 30–50 automated outreaches/day generates sufficient bookings to close 2+ clients per month | Pipeline too thin — monthly revenue targets miss and agency burns months in low-revenue limbo | Measure booking rate per 100 contacts over first 30 days; if < 2%, adjust channel mix (LinkedIn DMs, Meta Ads) or ICP targeting | No |
| 5 | Async delivery (Loom, no live training sessions) will be accepted by clients paying $1,500–$7,000 | Clients demand live calls — adds founder hours, caps capacity, and breaks the async-first model | Track requests for live calls in first 5 projects; if > 40% request them, introduce a paid live walkthrough add-on | No |

---

## Gaps by Severity

### Blocking

- **CTA buttons not connected to Calendly** — the site cannot generate revenue. 15-minute fix. Do today. Owner: Founder.

### High

- **Website chatbot not activated** — inbound lead qualification is non-functional. Connect chat widget to Claude API with 3-question prompt this week. Owner: Founder.
- **Typeform intake form not embedded on website** — leads arrive to assessment call unqualified. Embed before Calendly step, auto-post to Airtable via n8n, this week. Owner: Founder.
- **Claude Code + n8n-MCP not installed or tested** — core delivery system unproven before client work begins. Install, connect, and run a test build end-to-end. Target: Week 2–3. Owner: Founder.
- **No real client case studies on website** — 'Real Results' section shows placeholder content, limiting conversion. Replace after first 1–2 deliveries. Add efficiency benchmark as interim proof point. Owner: Founder.

### Medium

- **MRR targets not formally defined** — makes financial planning inconsistent. Define after closing first 2 clients using retainer conversion data. Owner: Founder.
- **No pricing anchor on website** — visitors cannot gauge affordability before booking. Add 'Projects start from $1,500' line or 3-tier pricing card. Owner: Founder.
- **Agency Retainer scope not defined** — no maximum on new automations or support hours included per tier, risking scope creep. Define before signing first retainer client. Owner: Founder.
- **Privacy Policy and Terms of Service pages are empty** — legal exposure before taking paying clients. Draft and publish before first paid project. Owner: Founder.

### Low

- **No SLA defined for after-hours automation failures** — unclear response expectations for retainer clients when automations break outside business hours. Define in retainer agreement template (e.g. 24-hr for non-critical, 4-hr for revenue-impacting). Owner: Founder.

---

## Next Actions on Assumptions

All 5 assumptions are unvalidated. These are the tests to run:

- [ ] Run 5 test Claude Code + n8n-MCP builds across different workflow types → validates: "Build agent reliably produces production workflows in under 1 hour"
- [ ] Track assessment-to-proposal-to-paid conversion rate over first 10 assessments → validates: "Free assessment + proposal model converts at > 30%"
- [ ] Include credential handoff script in first 3 proposals and log objections → validates: "SMB clients accept the credential ownership model without friction"
- [ ] Measure Instantly booking rate per 100 contacts over first 30 days of outreach → validates: "30–50 outreaches/day generates 2+ client closes per month"
- [ ] Track live call requests across first 5 project deliveries → validates: "Async delivery (Loom) is accepted by paying clients"
