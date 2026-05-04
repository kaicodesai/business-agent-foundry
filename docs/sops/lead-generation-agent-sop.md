# SOP — Lead Generation Agent
Version: 1.1
Last updated: 2026-05-04

## Purpose
Sources ICP-matched prospects from Apollo.io daily and writes them to the
Airtable Prospects table with `outreach_status = pending`, keeping the
outreach-agent pipeline fed with 30–50 fresh contacts per day.

## When to Run
Automatically — n8n daily cron (06:45, before outreach-agent fires at 07:00).
Can also be triggered manually by the owner at any time via n8n.

## Prerequisites

- [ ] Apollo.io account is active and API credits are available
- [ ] `pa-apollo-io` credential is set in n8n with a valid API key
- [ ] `pa-airtable` credential is active with read/write access to the
      Prospects table and automation_logs table
- [ ] Airtable Prospects table has all required fields: `prospect_name`,
      `company_name`, `industry`, `job_title`, `team_size`, `email`,
      `linkedin_url`, `outreach_status`, `source`, `sourced_at`
- [ ] Airtable `automation_logs` table exists for run summaries
- [ ] `[PA] Lead Generation` workflow is active in n8n
- [ ] During the 2026-05-04 to 2026-06-03 sprint, Apollo filters are set to
      US health/wellness businesses with 5-20 staff

## Steps

1. **Cron fires daily at 06:45** — workflow queries Apollo.io People Search
   API for up to 100 contacts matching the 2026-05-04 to 2026-06-03 ICP
   sprint: US health and wellness businesses with 5-20 staff. Target roles
   include owners, founders, CEOs, COOs, practice/clinic owners, practice
   managers, office managers, studio owners, wellness directors, and client
   or patient care coordinators.

2. **Pre-reveal deduplication check** — the workflow ranks the raw Apollo
   search results, checks Airtable for existing LinkedIn URLs or already
   visible emails, and selects up to 10 unseen candidates before spending
   Apollo reveal credits.

3. **Apollo reveal** — selected candidates are revealed through the stored
   n8n `pa-apollo-io` credential. Apollo API keys must not be hardcoded in
   Code nodes.

4. **Post-reveal email deduplication check** — for each revealed contact, the
   workflow queries Airtable to see if that email already exists. Duplicates
   are skipped.

5. **New records written** — net-new contacts are written to Airtable with
   `outreach_status = pending` and `source = apollo`.

6. **Run summary logged** — workflow writes a log entry to `automation_logs`
   with prospects found, added, skipped, Apollo page, reveal count, and
   pre-seen counts.

7. **Outreach-agent picks up new records** — outreach-agent fires 15 minutes
   later at 07:00 and processes any records with `outreach_status = pending`.

8. **Owner monitors weekly** — check `automation_logs` for run health.
   If `prospects_added` is consistently 0, Apollo ICP filters may need
   adjustment or a fresh Apollo export is needed.

## Expected Outputs

- Net-new Airtable prospect records per daily run (no duplicates), focused on
  US health/wellness businesses with 5-20 staff during the 30-day sprint
- All new records have `outreach_status = pending`
- Run summary in `automation_logs` for every execution

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| Apollo API key invalid | Apollo HTTP nodes fail with 401 error | Refresh Apollo API key in `pa-apollo-io` credential |
| Apollo API quota exhausted | Node 1 fails with 429 error | Wait for quota reset; consider upgrading Apollo plan |
| Airtable pre-reveal query fails | Workflow errors before reveal | Check `pa-airtable` credential and Airtable `linkedin_url` / `email` fields |
| Airtable post-reveal dedup query fails | Duplicate records created | Check `pa-airtable` credential and Airtable field names |
| Zero prospects returned | Run logs 0 added, 0 skipped | Widen ICP filters (industry or title) in workflow; or run fresh Apollo export manually |
| All prospects already exist | Run logs 0 added, N skipped | Normal after pipeline matures — no action needed until existing prospects are processed |
| Airtable write fails | Prospect not added, error in n8n log | Check Airtable field name mapping in node; verify `pa-airtable` has write permissions |

## Owner Confirmation Points

- **Before first run:** Verify Apollo ICP filters produce realistic results
  by running a test query in Apollo.io UI first. Confirm the search returns
  the expected profile before activating the workflow.
- **Weekly:** Review `automation_logs` — check `prospects_added` count and
  reply quality. For this sprint, relevance matters more than broad volume.
  Adjust health/wellness keywords if volume drops.
- **Monthly:** Audit Apollo credit usage. If credits are being consumed faster
  than expected, reduce the daily reveal cap in the workflow (default: 10).
