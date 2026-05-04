# SOP — Outreach Agent
Version: 1.1
Last updated: 2026-05-04

## Purpose
Generates and sends personalised cold outreach from Apollo prospect data in
Airtable, using the live n8n email nodes and ClickUp/Airtable tracking.

## When to Run
Automatically — n8n daily cron. Also triggered when new prospects are added
to Airtable from an Apollo export. Target: 30–50 new contacts per day.

## Prerequisites

- [ ] Airtable has prospect records with `outreach_status = pending`
- [ ] Prospect records include: name, company, industry, job title, team size, email
- [ ] During the 2026-05-04 to 2026-06-03 sprint, prospect records should be
      US health/wellness businesses with 5-20 staff
- [ ] SMTP inbox health is healthy
- [ ] OpenRouter credential is active
- [ ] Lead Generation has run through the live Apollo/n8n integration

## Steps

1. **Lead Generation sources prospects from Apollo** — for the 2026-05-04 to
   2026-06-03 sprint, filter to US health and wellness businesses with 5-20
   staff. Target owners, founders, CEOs, COOs, practice/clinic owners,
   practice managers, office managers, studio owners, wellness directors, and
   client or patient care coordinators. New records land in Airtable with
   `outreach_status = pending`.

2. **Cron fires daily** — workflow queries Airtable for up to 50 pending
   prospects that match the sprint ICP. Older non-health/wellness pending
   records are held back by the Airtable filter during this sprint.

3. **Agent generates emails** — AI writes a short human 3-touch sequence:
   one specific observation, one likely health/wellness operational pain
   point, and one simple question. No feature lists, generic openers, hype,
   or Calendly language in the generated body. The parser also removes dash
   characters/hyphens, extra question sentences, and banned AI/workflow terms
   before the HTML wrapper is built.

4. **Agent sends Email 1** — the HTML wrapper is built from the cleaned body,
   Email 1 is sent via the live n8n email node, and a ClickUp outreach task is
   created.

5. **Agent updates Airtable** — `outreach_status = email_1_sent`,
   `email_1_sent_at`, saved email body fields, and `clickup_outreach_task_id`.

6. **Follow-ups** — Email 2 and Email 3 are sent only when their due-date
   filters match and the record still matches the sprint ICP.

7. **Owner monitors replies** — reply detection updates Airtable/ClickUp and
   emails Kai. Kai responds personally and either books an assessment call or
   closes the lead.

## Expected Outputs

- Up to 50 first-touch emails sent per run, limited to the sprint ICP
- Airtable `outreach_status` updated for all processed prospects
- No prospect receives more than one active sequence

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| No pending prospects | Run completes with no campaigns queued | Run Apollo export to refresh Airtable prospect list |
| SMTP send error | Email not sent, Airtable not updated | Check SMTP credential/inbox health; re-run for failed prospects |
| AI generates generic email | Email lacks personalisation | Review prospect data quality and prompt compliance — the body should name one likely pain and ask one question |
| AI generates dashes or extra questions | Email feels automated | Parser cleanup should remove these; if they persist, inspect `Parse Email Sequence` |
| Bounce rate > 3% | Inbox health risk | Pause campaign; audit Apollo list quality; remove invalid emails |
| Prospect already in sequence re-queued | Outreach_status not filtered correctly | Verify IF node logic in n8n; check Airtable filter formula |

## Owner Confirmation Points

- **Before first run:** Send one test email to owner's own address to review
  Claude output quality. Confirm tone is right before enabling daily sends.
- **Weekly:** Review sent records, reply rate, bounce rate, and message
  quality. Reply rate target: > 2% while the ICP is being tightened.
- **Monthly:** Refresh Apollo prospect list with a new export. Prospects who
  have not replied after the 3-touch sequence are marked `outreach_status = closed`
  and not re-queued.
