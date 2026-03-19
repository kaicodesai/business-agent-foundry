# SOP — Outreach Agent
Version: 1.0
Last updated: 2026-03-15

## Purpose
Generates and queues personalised cold outreach campaigns in Instantly.ai
for 30–50 new prospects per day from Apollo prospect data in Airtable.

## When to Run
Automatically — n8n daily cron. Also triggered when new prospects are added
to Airtable from an Apollo export. Target: 30–50 new contacts per day.

## Prerequisites

- [ ] Airtable has prospect records with `outreach_status = pending`
- [ ] Prospect records include: name, company, industry, job title, team size, email
- [ ] Instantly.ai campaign workspace is active and inbox health is healthy
- [ ] Anthropic API credential is active
- [ ] Apollo prospect export has been run (owner does this manually or via Apollo n8n integration)

## Steps

1. **Owner exports prospects from Apollo** — filter by: target industry,
   company size 10–200, job title (founder, operations manager, COO, CEO).
   Target: 100–200 contacts per batch, exported to Airtable with
   `outreach_status = pending`.

2. **Cron fires daily** — workflow queries Airtable for up to 50 pending
   prospects.

3. **Agent generates emails** — Claude writes personalised initial email
   + 2 follow-ups for each prospect.

4. **Agent queues campaigns** — each prospect is added to an Instantly.ai
   campaign with the 3-email sequence.

5. **Agent updates Airtable** — `outreach_status = in_sequence`,
   `outreach_started_at` timestamp, `instantly_campaign_id`.

6. **Owner monitors Instantly.ai** — checks weekly: open rates, reply rates,
   bounce rates. Pauses campaigns if bounce rate > 3% or reply rate drops
   below expected.

7. **Owner handles replies manually** — Instantly.ai flags replies. Owner
   responds personally and either books an assessment call or closes the lead.

## Expected Outputs

- 30–50 Instantly.ai campaigns queued per day
- Airtable `outreach_status` updated for all processed prospects
- No prospect receives more than one campaign

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| No pending prospects | Run completes with no campaigns queued | Run Apollo export to refresh Airtable prospect list |
| Instantly.ai API error | Campaign not queued, Airtable not updated | Check Instantly.ai API key validity; re-run for failed prospects |
| Claude generates generic email | Email lacks personalisation | Review prospect data quality — Claude needs industry, role, and team size at minimum |
| Bounce rate > 3% | Instantly.ai flags inbox health risk | Pause campaign; audit Apollo list quality; remove invalid emails |
| Prospect already in sequence re-queued | Outreach_status not filtered correctly | Verify IF node logic in n8n; check Airtable filter formula |

## Owner Confirmation Points

- **Before first run:** Send one test email to owner's own address to review
  Claude output quality. Confirm tone is right before enabling daily sends.
- **Weekly:** Check Instantly.ai dashboard — open rate, reply rate, bounce rate.
  Open rate target: > 30%. Reply rate target: > 2%.
- **Monthly:** Refresh Apollo prospect list with a new export. Prospects who
  have not replied after the 3-touch sequence are marked `outreach_status = closed`
  and not re-queued.
