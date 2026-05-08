# Airtable Structure — Phoenix Automation
**Version:** 1.2
**Last updated:** 2026-05-08
**Base ID:** `appMLHig3CN7WW0iW`
**Status:** Prospects + Automation Logs sections refreshed from live Airtable on 2026-05-08. Clients section last refreshed 2026-03-22.

> This document is the canonical definition of the Airtable schema for Phoenix Automation.
> Every field is defined with its type, which agent/workflow writes it, which reads it, and whether it is required.
> Update this file whenever schema changes are made and add an entry to the Change Log in PROJECT_OVERVIEW.md.

---

## Tables Overview

| Table | Table ID | Purpose | Status |
|-------|---------|---------|--------|
| Clients | `tblfvqqyYukRJQYmQ` | One record per client — tracks the full client lifecycle | ✅ Exists |
| Prospects | `tbluEsKoQ2p49ktVq` | One record per outbound lead sourced from Apollo.io | ✅ Exists |
| Automation Logs | `tblL7tDAh1KTLtwpt` | One row per lead-gen workflow run — aggregate stats | ✅ Exists |

**Decision for Kai:** No new tables are needed at this stage. Proposals, invoices, and referrals are tracked via fields on existing tables or via external tools (Stripe for invoices, Instantly.ai for referral sequences). A `Workflow Executions` table is not needed — the reporting-agent reads execution data directly from the n8n API.

---

## Table 1 — Clients (`tblfvqqyYukRJQYmQ`)

> ⚠️ CRITICAL: Always use table ID `tblfvqqyYukRJQYmQ`. The longer variant causes 403 errors.

### Core Identity Fields

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `company_name` | singleLineText | Onboarding webhook | All agents | ✅ Required | Primary field. Onboarding automation reads `body.company_name || body.client_name` |
| `email` | email | Onboarding webhook | status-update-agent, reporting-agent, referral-trigger-agent | ✅ Required | Client billing email — destination for all automated emails |
| `contact_name` | singleLineText | Onboarding webhook | status-update-agent, reporting-agent | ✅ Required | Billing contact name — used in email salutations |
| `client_slug` | singleLineText | Onboarding automation (Code node) | onboarding-automation, workflow-builder-agent, all file-path agents | ✅ Required | Derived: `company_name` slugified (lowercase, hyphens). e.g. `meridian-consulting-group`. Used to name ClickUp projects and repo file paths |
| `industry` | singleLineText | Lead qualification agent / Manual | proposal-drafting-agent, outreach-agent | Optional | Client industry vertical |
| `client_timezone` | singleLineText | Manual (owner sets post-onboarding) | status-update-agent | Optional | e.g. `America/New_York` — used to time weekly status emails |

### Lead & Qualification Fields

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `lead_score_grade` | singleLineText | lead-qualification-agent | onboarding-automation (Airtable lookup), reporting-agent | Optional | A, B, C, D — from Typeform scoring |
| `pre_call_brief` | multilineText | lead-qualification-agent | Owner (pre-call review) | Optional | Claude-written briefing note for owner before assessment call |
| `lead_score_total` | number | lead-qualification-agent | Owner | Optional | 0–8 numeric score from Typeform scoring dimensions |

> **Note for Kai:** `pre_call_brief` and `lead_score_total` are currently NOT in the Clients table — they are implied by the lead-qualification-agent spec. Decision needed: should these live on the Prospects table (as the lead record before conversion) or be copied to Clients on conversion? Recommendation: add them to **Prospects** (where they are first written), and only copy `lead_score_grade` to Clients (already done).

### Proposal & Commercial Fields

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `service_tier` | singleSelect | Onboarding webhook | reporting-agent (filters retainer clients), referral-trigger-agent | ✅ Required | Options: `starter-build`, `growth-package`, `agency-retainer` |
| `proposal_value` | currency | Manual (owner sets) | Owner (tracking) | Optional | ⚠️ MISSING — needs to be added. Value of the accepted proposal in USD |
| `scope_of_work` | multilineText | automation-scoping-agent / Manual | onboarding-automation, status-update-agent | Optional | Summary of automations agreed in scope |
| `tools_required` | multilineText | automation-scoping-agent / Manual | onboarding-automation (reads to build credentials checklist) | Optional | Comma-separated tool list e.g. `Gmail, ClickUp, Airtable` |

### Project Status Fields

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `project_status` | singleSelect | onboarding-automation; Owner (manual updates) | status-update-agent (filters `live`), reporting-agent (filters `live`), referral-trigger-agent | ✅ Required | Values: `lead`, `proposal_sent`, `onboarding.in_progress`, `live`, `churned` |
| `project_launch_date` | date | Owner (set on activation day) | referral-trigger-agent (reads to calculate 30-day mark) | Optional | ⚠️ MISSING — needs to be added. ISO date. Set by owner when workflows go live |
| `onboarding_started_at` | dateTime | onboarding-automation | Owner (tracking) | Optional | ISO 8601 — set when webhook fires |

### n8n & ClickUp Integration Fields

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `n8n_workspace_id` | singleLineText | onboarding-automation | workflow-builder-agent | Optional | e.g. `[PA] meridian-consulting-group` |
| `n8n_credentials_template_id` | singleLineText | onboarding-automation | workflow-builder-agent | Optional | e.g. `creds-checklist-meridian-consulting-group` |
| `n8n_workflow_ids` | multilineText | Manual (owner adds after build) | reporting-agent (reads to fetch execution logs) | Optional | ⚠️ PROPOSED — not yet added. Comma-separated list of n8n workflow IDs for this client. Required for reporting-agent to function |
| `clickup_folder_id` | singleLineText | onboarding-automation | status-update-agent (reads to fetch ClickUp folder tasks) | Optional | ClickUp folder ID for this client's project (field ID: `fld9PdwZetXwjENmb`) |
| `credentials_checklist` | multilineText | onboarding-automation | Owner (Checkpoint 2 review) | Optional | JSON: `{tool: status}` per tool in scope |

### Retention & Reporting Fields

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `last_status_update_sent_at` | dateTime | status-update-agent | Owner (tracking) | Optional | ISO 8601 — updated each Monday after status email sends |
| `last_report_sent_at` | dateTime | reporting-agent | Owner (tracking) | Optional | ⚠️ MISSING — needs to be added. ISO 8601 |
| `report_count` | number | reporting-agent (increments +1 each month) | Owner (tracking) | Optional | ⚠️ PROPOSED — not yet added. Total reports sent to this client |
| `last_month_executions` | number | reporting-agent | Owner, referral-trigger-agent | Optional | ⚠️ PROPOSED — not yet added. Total automation runs last 30 days |
| `last_month_uptime_pct` | number | reporting-agent | Owner | Optional | ⚠️ PROPOSED — not yet added. e.g. `98.5` |
| `last_month_time_saved_hrs` | number | reporting-agent | referral-trigger-agent (uses in referral email) | Optional | ⚠️ PROPOSED — not yet added. Estimated hours saved last month |
| `hours_saved_per_run` | number | Manual (owner sets after build delivery) | reporting-agent (multiplies by successful executions) | Optional | ⚠️ PROPOSED — not yet added. If blank, reporting-agent defaults to 0.1 hrs/run |
| `automations_delivered` | multilineText | Manual (owner sets after build) | referral-trigger-agent (references in referral email) | Optional | ⚠️ PROPOSED — not yet added. Names of automations built e.g. `Lead Gen, Onboarding` |

### Referral Fields

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `referral_sequence_sent` | checkbox | referral-trigger-agent (sets to true after queuing) | referral-trigger-agent (gate — skips if true) | Optional | ⚠️ PROPOSED — not yet added. Prevents duplicate referral sequences. Never reset without owner instruction |
| `referral_sequence_sent_at` | dateTime | referral-trigger-agent | Owner (tracking) | Optional | ⚠️ MISSING — needs to be added. ISO 8601 |
| `instantly_referral_campaign_id` | singleLineText | referral-trigger-agent | Owner (Instantly.ai lookup) | Optional | ⚠️ PROPOSED — not yet added. Campaign ID from Instantly.ai |
| `referral_source` | singleLineText | Owner (manual — entered on new lead created by referral) | Owner | Optional | ⚠️ PROPOSED — not yet added. Free text: which client referred this lead |

### Admin Fields

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `notes` | multilineText | Owner (manual) | Owner | Optional | ⚠️ MISSING — needs to be added. Free-text notes on the client relationship |

---

### Clients Table — Implementation Summary

**5 fields confirmed missing (add now):**
| Field | Type | Priority |
|-------|------|---------|
| `proposal_value` | currency | Medium |
| `project_launch_date` | date | High — referral-trigger-agent cannot function without this |
| `last_report_sent_at` | date | High — reporting-agent writes this |
| `referral_sequence_sent_at` | date | High — referral-trigger-agent writes this |
| `notes` | multilineText | Low |

**10 proposed fields — ✅ ADDED 2026-03-22:**
| Field | Type | Added | Field ID |
|-------|------|-------|---------|
| `n8n_workflow_ids` | multilineText | ✅ | `fld0faAZi4TmwpP9J` |
| `hours_saved_per_week` | number (2dp) | ✅ | `fldiGcSZWVWTxv5xH` |
| `hours_saved_per_year` | number (2dp) | ✅ | `fldpCRJ523c1WaRh0` |
| `last_month_executions` | number (integer) | ✅ | `fldM0lDU75YrGSldA` |
| `last_month_errors` | number (integer) | ✅ | `fldSezJjtgJdbTaFL` |
| `total_executions` | number (integer) | ✅ | `fldF0VI87ANX2HMlR` |
| `referral_source` | singleLineText | ✅ | `fld3EJ6umiwft6Sh0` |
| `referral_sequence_sent` | checkbox | ✅ | `fld5AJCnq1Qd9BYmy` |
| `lead_score_total` | number (integer) | ✅ | `fld2rpfsXSFipmqi6` |
| `pre_call_brief` | multilineText | ✅ | `fldCd8333z772ATsU` |

> **Note:** Field names differ slightly from original spec where user confirmed actual names during session (e.g. `hours_saved_per_week` / `hours_saved_per_year` instead of `hours_saved_per_run` / `last_month_time_saved_hrs`; `last_month_errors` and `total_executions` added as new tracking fields).

---

## Table 2 — Prospects (`tbluEsKoQ2p49ktVq`)

> Refreshed from live Airtable on 2026-05-08 by direct field probe. All fields below are confirmed to exist on the table.

### Identity & sourcing (lead-generation-agent)

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `prospect_name` | singleLineText | lead-generation-agent | outreach-agent | ✅ Required | Primary field. Full name of the contact |
| `company_name` | singleLineText | lead-generation-agent | outreach-agent | ✅ Required | Company the prospect works at |
| `client_slug` | singleLineText | lead-generation-agent (slugified `company_name`) | outreach-agent, scoping flow | Optional | Lowercased, hyphenated company slug. Bridges Prospects → Clients on conversion |
| `apollo_person_id` | singleLineText | lead-generation-agent | lead-generation-agent (pre-reveal dedup), Backfill Apollo Person ID node | Optional | Apollo person ID. Used to dedup against already-revealed contacts before spending another reveal credit |
| `industry` | singleLineText | lead-generation-agent | outreach-agent | ✅ Required | Industry vertical from Apollo |
| `job_title` | singleLineText | lead-generation-agent | outreach-agent | ✅ Required | e.g. `Founder`, `Operations Manager` |
| `team_size` | number | lead-generation-agent | outreach-agent, lead-qualification-agent | ✅ Required | Employee count (integer) |
| `email` | email | lead-generation-agent | outreach-agent | ✅ Required | Contact email for outreach sequencing |
| `linkedin_url` | url | lead-generation-agent | lead-generation-agent (pre-reveal dedup), Owner (research) | Optional | LinkedIn profile URL from Apollo |
| `source` | singleLineText | lead-generation-agent | Owner (attribution) | Optional | e.g. `apollo` |
| `sourced_at` | dateTime | lead-generation-agent | Owner (tracking) | Optional | ISO 8601 timestamp |

### Outreach lifecycle (outreach-agent)

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `outreach_status` | singleSelect | lead-generation-agent (sets `pending`); outreach-agent (advances through sequence) | outreach-agent (filters `pending`, `email_1_sent`, `email_2_sent`) | ✅ Required | Includes `pending`, `email_1_sent`, `email_2_sent`, `email_3_sent`, `replied`, `closed`, `error` |
| `email_1_text` | multilineText | outreach-agent | outreach-agent | Optional | Body of email 1 — set when generated, read before sending |
| `email_1_sent_at` | dateTime | outreach-agent | outreach-agent (cadence gate for email 2) | Optional | ISO 8601 |
| `email_2_text` | multilineText | outreach-agent | outreach-agent | Optional | Body of email 2 (follow-up) |
| `email_2_sent_at` | dateTime | outreach-agent | outreach-agent (cadence gate for email 3) | Optional | ISO 8601 |
| `email_3_text` | multilineText | outreach-agent | outreach-agent | Optional | Body of email 3 (final follow-up) |
| `email_3_sent_at` | dateTime | outreach-agent | Owner (tracking) | Optional | ISO 8601 |
| `outreach_error` | multilineText | outreach-agent | Owner (debugging) | Optional | Last error message when send/generation fails |
| `clickup_outreach_task_id` | singleLineText | outreach-agent | outreach-agent, Owner (cross-reference) | Optional | ClickUp task created for the outreach |
| `project_status` | singleSelect | scoping/onboarding flow | scoping flow | Optional | Mirrors Clients.project_status — set when prospect converts (e.g. `proposal_sent`, `live`). Verify intent — possibly redundant with Clients table |

### Pre-call brief — exists under a non-snake_case name

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `Precall Brief` | multilineText | lead-qualification-agent | scoping-notifier (renders in email if present) | Optional | ⚠️ The actual Airtable column name is `Precall Brief` (mixed case, with space). Every reference in n8n uses `$json['Precall Brief']`. PROJECT_OVERVIEW.md and several agent files still call this field `pre_call_brief` — those are doc bugs, not table bugs. Recommended fix: rename the column to `pre_call_brief` to match the rest of the schema |

### Fields NOT present (proposed but never added)

These three fields were proposed in earlier doc revisions but were verified absent from the live table on 2026-05-08:

| Field | Status | Notes |
|-------|--------|-------|
| `outreach_started_at` | ❌ Does not exist | Not added. Outreach uses `email_1_sent_at` as the de facto start timestamp |
| `instantly_campaign_id` | ❌ Does not exist | Not added. Outreach now sends via SMTP rather than Instantly.ai |
| `lead_score_total` | ❌ Does not exist | Not added. Lead scoring writes to the Clients table only (see Clients.`lead_score_total`) |

### Prospects Table — Implementation Summary

**22 fields confirmed live** (21 snake_case + 1 mixed-case `Precall Brief`). The table spans the full prospect lifecycle (sourcing → outreach sequencing → scoping → conversion handoff). Three of the four "proposed" fields from v1.1 have been retired; `pre_call_brief` was previously thought retired but actually exists as `Precall Brief` — see note above.

---

## Table 3 — Automation Logs (`tblL7tDAh1KTLtwpt`)

> Refreshed from live Airtable on 2026-05-08. Now serves as a universal run log shared by lead-generation-agent and the Typeform Lead Qualification workflow.

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `workflow` | singleLineText | lead-generation-agent, lead-qualification-agent | Owner (monitoring) | ✅ Required | e.g. `[PA] Lead Generation`, `[PA] Typeform Lead Qualification` |
| `run_at` | dateTime | lead-generation-agent, lead-qualification-agent | Owner (monitoring) | ✅ Required | ISO 8601 |
| `timestamp` | dateTime | lead-qualification-agent | Owner (monitoring) | Optional | Mirror of `run_at` written by Typeform flow. Lead-gen writes `run_at` only |
| `status` | singleLineText | lead-generation-agent (`completed` or `error: <msg>`); lead-qualification-agent (`completed`) | Owner (monitoring) | ✅ Required | Free text. Lead-gen success path writes `completed`; error paths write `error: ...` |
| `prospects_found` | number | lead-generation-agent | Owner (monitoring) | Optional | Total returned from Apollo |
| `prospects_added` | number | lead-generation-agent, lead-qualification-agent | Owner (monitoring) | Optional | Net new written to Prospects/Clients |
| `prospects_skipped` | number | lead-generation-agent | Owner (monitoring) | Optional | Duplicates / unrevealed / non-wellness skipped |
| `notes` | multilineText | lead-generation-agent | Owner (monitoring) | Optional | Pipe-delimited run context: ICP sprint, vertical, Apollo page, candidate pool count, reveal count, pre-seen count, skip reasons |
| `event` | singleLineText | lead-qualification-agent | Owner (monitoring) | Optional | e.g. `typeform_lead_scored` — lets the Typeform flow tag what kind of run it logged |
| `client` | singleLineText | lead-qualification-agent | Owner (monitoring) | Optional | Company/lead name for Typeform-sourced events |

**10 fields confirmed live.** The original 6-field design has been extended in-place by the Typeform lead-qualification flow (which added `client`, `event`, `timestamp`) and by the lead-generation reveal architecture (which added `notes`).

---

## Field Status Summary

| Category | Count | Status |
|---------|-------|--------|
| Existing Clients fields (confirmed correct) | 17 | ✅ No changes |
| Missing Clients fields (add now) | 5 | ⚠️ Add before next agent build |
| Proposed Clients fields (add before reporting/referral agents) | 10 | 📋 Kai to confirm |
| Live Prospects fields (verified 2026-05-08) | 22 | ✅ No changes |
| Retired Prospects "proposed" fields (never added) | 3 | ❌ Removed from spec |
| Live Automation Logs fields (verified 2026-05-08) | 10 | ✅ No changes |
| **Total fields when complete** | **64** | |

---

## Decisions Needed from Kai

| # | Decision | Recommendation |
|---|---------|---------------|
| 1 | Add 5 missing Clients fields now? | **Yes — add now.** All required by agents already defined |
| 2 | Add 10 proposed reporting/referral Clients fields? | **Yes — add before building reporting-agent** |
| 3 | Add 4 proposed Prospects fields? | **Resolved 2026-05-08:** retired. Outreach uses `email_1_sent_at` instead of `outreach_started_at`; Instantly.ai was dropped for SMTP; lead scoring writes to Clients |
| 4 | Should `lead_score_total` and `pre_call_brief` live on Prospects or Clients? | **Resolved:** Clients only — both fields are present on the Clients table |
| 5 | Extend Automation Logs table to cover outreach + reporting runs? | **In progress:** Typeform Lead Qualification already logs here (added `client`, `event`, `timestamp`, `notes`). Outreach + reporting still TODO |
| 6 | New tables needed? | **No** — current 3 tables are sufficient for all 9 agents |

---

## Test Records (clean up before first real client)

| Record | Table | Airtable Record ID |
|--------|-------|--------------------|
| Status Test Client | Clients | `rec92eToEuIx06mJr` |
| Meridian Consulting Group | Clients | `rectfzSFPqjRQU4u1` |
