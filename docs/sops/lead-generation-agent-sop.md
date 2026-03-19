# SOP — Lead Generation Agent
Version: 1.0
Last updated: 2026-03-19

## Purpose
Sources ICP-matched prospects from Apollo.io daily and writes them to the
Airtable Prospects table with `outreach_status = pending`, keeping the
outreach-agent pipeline fed with 30–50 fresh contacts per day.

## When to Run
Automatically — n8n daily cron (06:45, before outreach-agent fires at 07:00).
Can also be triggered manually by the owner at any time via n8n.

## Prerequisites

- [ ] Apollo.io account is active and API credits are available
- [ ] `pa-apollo` credential is set in n8n with a valid API key
- [ ] `pa-airtable` credential is active with read/write access to the
      Prospects table and automation_logs table
- [ ] Airtable Prospects table has all required fields: `prospect_name`,
      `company_name`, `industry`, `job_title`, `team_size`, `email`,
      `linkedin_url`, `outreach_status`, `source`, `sourced_at`
- [ ] Airtable `automation_logs` table exists for run summaries
- [ ] `[PA] Lead Generation` workflow is active in n8n

## Steps

1. **Cron fires daily at 06:45** — workflow queries Apollo.io People Search
   API for up to 100 contacts matching ICP criteria (founders, ops managers,
   COOs, CEOs at 10–200 person businesses in target industries).

2. **Deduplication check** — for each Apollo result, the workflow queries
   Airtable to see if that email already exists. Duplicates are skipped.

3. **New records written** — net-new contacts are written to Airtable with
   `outreach_status = pending` and `source = apollo`.

4. **Run summary logged** — workflow writes a log entry to `automation_logs`
   with prospects found, added, and skipped counts.

5. **Outreach-agent picks up new records** — outreach-agent fires 15 minutes
   later at 07:00 and processes any records with `outreach_status = pending`.

6. **Owner monitors weekly** — check `automation_logs` for run health.
   If `prospects_added` is consistently 0, Apollo ICP filters may need
   adjustment or a fresh Apollo export is needed.

## Expected Outputs

- 30–100 new Airtable prospect records per daily run (net-new, no duplicates)
- All new records have `outreach_status = pending`
- Run summary in `automation_logs` for every execution

## Failure Modes

| Failure | Symptom | Resolution |
|---------|---------|-----------|
| Apollo API key invalid | Node 1 fails with 401 error | Refresh Apollo API key in `pa-apollo` credential |
| Apollo API quota exhausted | Node 1 fails with 429 error | Wait for quota reset; consider upgrading Apollo plan |
| Airtable dedup query fails | Duplicate records created | Check `pa-airtable` credential and Airtable field names |
| Zero prospects returned | Run logs 0 added, 0 skipped | Widen ICP filters (industry or title) in workflow; or run fresh Apollo export manually |
| All prospects already exist | Run logs 0 added, N skipped | Normal after pipeline matures — no action needed until existing prospects are processed |
| Airtable write fails | Prospect not added, error in n8n log | Check Airtable field name mapping in node; verify `pa-airtable` has write permissions |

## Owner Confirmation Points

- **Before first run:** Verify Apollo ICP filters produce realistic results
  by running a test query in Apollo.io UI first. Confirm the search returns
  the expected profile before activating the workflow.
- **Weekly:** Review `automation_logs` — check `prospects_added` count. Target
  is 30–100 net-new prospects per day. Adjust Apollo filters if volume drops.
- **Monthly:** Audit Apollo credit usage. If credits are being consumed faster
  than expected, reduce the daily cap in the workflow (default: 100).
