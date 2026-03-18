# SOP — Lead Generation Agent
Version: 1.0
Last updated: 2026-03-17

## Purpose

Sources outbound leads from Apollo.io matching the Phoenix Automation ICP,
enriches each lead with org-level tech stack and pain point signals, scores
each lead 0–8, and queues Grade A and Grade B prospects for outreach-agent
to contact. Grade C leads are logged but not queued.

## When to Run

Automatically — n8n daily cron at 06:00 (owner local time). Target: 100 new
leads sourced per day, 30–80 qualifying for outreach after scoring.

The owner may also trigger the workflow manually after refreshing Apollo search
filters or after a new ICP segment is added.

## Prerequisites

- [ ] Apollo.io account is active with People Search and Org Enrich API access
- [ ] `pa-apollo-io` credential is configured in n8n with a valid API key
- [ ] `pa-airtable` credential is active and Prospects table exists
  with all required fields (see agent definition for full field list)
- [ ] `pa-anthropic` credential is active
- [ ] Apollo search filters have been reviewed by owner and match current ICP:
  - Job titles: Founder, Owner, CEO, COO, Operations Manager, Director of Operations
  - Company size: 10–200 employees
  - Industries: e-commerce, professional services, healthcare, logistics,
    marketing agencies
  - Email status: verified only

## Steps

1. **Cron triggers at 06:00** — workflow executes before the outreach-agent's
   07:00 window, ensuring fresh Grade A/B leads are in Airtable before the
   outreach run begins.

2. **Agent calls Apollo People Search** — fetches up to 100 verified-email
   contacts matching ICP filters. If zero results, workflow exits cleanly and
   logs `no_results_from_apollo`.

3. **Agent loops over each prospect** — for each contact:

   a. **Dedup check** — queries Airtable for existing record with matching email.
      If found, skips prospect. No duplicates enter the pipeline.

   b. **Org enrichment** — calls Apollo Organization Enrich for the company
      domain. Retrieves technologies array, keywords, revenue band.

   c. **Scoring** — passes all Apollo data to `claude-haiku-4-5`. Claude scores
      the lead 0–8 across four dimensions (industry fit, team size fit, role fit,
      tech stack pain signals) and returns structured JSON with grade.

   d. **Grade assignment** — A (6–8), B (3–5), or C (0–2). Grade A and B leads
      receive `outreach_status = pending`. Grade C leads receive
      `outreach_status = disqualified`.

   e. **Airtable record created** — all leads are logged regardless of grade.
      Grade A/B records are immediately visible to outreach-agent.

4. **outreach-agent picks up Grade A/B leads** — at 07:00, outreach-agent
   queries Airtable for `outreach_status = pending` and generates personalised
   email sequences. No manual step required between agents.

5. **Owner monitors pipeline weekly** — reviews:
   - Grade distribution: if Grade C percentage is > 60%, Apollo search filters
     need tightening
   - Lead volume: if daily intake drops below 20, refresh Apollo export or
     broaden ICP criteria
   - Airtable for `outreach_status = error` records — these require investigation

## Expected Outputs

- Up to 100 new prospect records created in Airtable per day
- Grade A and B leads (`outreach_status = pending`) picked up by outreach-agent
  within 1 hour
- All records include full scoring breakdown: total score, grade, 4 dimension
  scores, and one-sentence Claude rationale

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| Apollo returns 0 results | No records created; workflow exits | Review and broaden Apollo search filters; confirm API key has People Search access |
| Apollo rate limit hit mid-loop | Partial run; some prospects skipped | Check Apollo plan limits; reduce `per_page` or run twice daily at lower volume |
| Claude scoring error (malformed JSON) | Prospect logged as `outreach_status = error` | Check Anthropic API key; review Claude prompt in scoring node |
| Airtable write fails | Prospect not logged; error workflow triggered | Check Airtable credential; confirm Prospects table schema matches required fields |
| High Grade C rate (> 60%) | Many leads logged as `disqualified` | Tighten Apollo job title and industry filters; Apollo list quality may have degraded |
| Org Enrich returns empty technologies | Tech stack signal missing | Expected behaviour — scoring uses neutral score (1) for Dimension 4; no action needed |
| Duplicate prospect re-appears | `outreach_status` not pending, but another record exists | Investigate dedup IF node — verify Airtable filter formula is correct |

## Owner Confirmation Points

- **Before first run:** Review Apollo search filter configuration in n8n — confirm
  job titles, industry tags, and employee count ranges match current ICP. Send
  one test run with `per_page: 5` and review the 5 records created in Airtable.
  Confirm scoring looks correct before enabling daily cron.

- **After first full run:** Check Airtable for Grade distribution. If most leads
  are Grade C, Apollo filters are pulling the wrong audience — refine before
  re-enabling.

- **Weekly:** Check Airtable for `outreach_status = error` records. Investigate
  and resolve. Monitor Grade A/B vs Grade C ratio — target at least 30% Grade A/B.

- **Monthly:** Review Apollo plan usage — confirm daily runs are not approaching
  API call limits. Audit scoring quality: check if Grade A prospects who received
  outreach are converting to assessment calls at expected rates. Adjust scoring
  weights or ICP filters if conversion is below target.

## Owner Override

If a Grade C prospect should be queued despite their score (e.g. a referral that
came through the Apollo list):

1. Find the record in Airtable Prospects table
2. Update `outreach_status` from `disqualified` to `pending`
3. Add a note to the `scoring_notes` field: "OWNER OVERRIDE — [reason]"
4. outreach-agent will pick up the record on its next daily run

Do not modify the lead_score fields — keep the original score for audit purposes.
