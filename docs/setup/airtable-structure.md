# Airtable Structure — Phoenix Automation
**Version:** 1.1
**Last updated:** 2026-03-22
**Base ID:** `appMLHig3CN7WW0iW`
**Status:** Fully implemented — all fields added as of 2026-03-22

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

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `prospect_name` | singleLineText | lead-generation-agent | outreach-agent | ✅ Required | Primary field. Full name of the contact |
| `company_name` | singleLineText | lead-generation-agent | outreach-agent | ✅ Required | Company the prospect works at |
| `industry` | singleLineText | lead-generation-agent | outreach-agent | ✅ Required | Industry vertical from Apollo |
| `job_title` | singleLineText | lead-generation-agent | outreach-agent | ✅ Required | e.g. `Founder`, `Operations Manager` |
| `team_size` | number | lead-generation-agent | outreach-agent, lead-qualification-agent | ✅ Required | Employee count (integer) |
| `email` | email | lead-generation-agent | outreach-agent | ✅ Required | Contact email for outreach sequencing |
| `linkedin_url` | url | lead-generation-agent | Owner (research) | Optional | LinkedIn profile URL from Apollo |
| `outreach_status` | singleSelect | lead-generation-agent (sets `pending`); outreach-agent (sets `in_sequence`) | outreach-agent (filters `pending`) | ✅ Required | Values: `pending`, `in_sequence`, `replied`, `closed`, `error` |
| `source` | singleLineText | lead-generation-agent | Owner (attribution) | Optional | e.g. `apollo.io` |
| `sourced_at` | dateTime | lead-generation-agent | Owner (tracking) | Optional | ISO 8601 timestamp |
| `outreach_started_at` | dateTime | outreach-agent | Owner (tracking) | Optional | ⚠️ PROPOSED — add before building outreach-agent. ISO 8601 — when first email queued |
| `instantly_campaign_id` | singleLineText | outreach-agent | Owner (Instantly.ai lookup) | Optional | ⚠️ PROPOSED — add before building outreach-agent. Campaign ID from Instantly.ai |
| `lead_score_total` | number | lead-qualification-agent | Owner | Optional | ⚠️ PROPOSED — add before building lead-qualification-agent. 0–8 Typeform score |
| `pre_call_brief` | multilineText | lead-qualification-agent | Owner (pre-call review) | Optional | ⚠️ PROPOSED — add before building lead-qualification-agent. Claude-written brief |

### Prospects Table — Implementation Summary

**All 10 existing fields confirmed correct.**

**4 proposed fields to add before building outreach and lead qual agents:**
| Field | Type | Add Before |
|-------|------|-----------|
| `outreach_started_at` | dateTime | Building outreach-agent |
| `instantly_campaign_id` | singleLineText | Building outreach-agent |
| `lead_score_total` | number | Building lead-qualification-agent |
| `pre_call_brief` | multilineText | Building lead-qualification-agent |

---

## Table 3 — Automation Logs (`tblL7tDAh1KTLtwpt`)

| Field Name | Type | Written By | Read By | Required | Notes |
|-----------|------|-----------|---------|----------|-------|
| `workflow` | singleLineText | lead-generation-agent | Owner (monitoring) | ✅ Required | e.g. `[PA] Lead Generation` |
| `run_at` | dateTime | lead-generation-agent | Owner (monitoring) | ✅ Required | ISO 8601 |
| `prospects_found` | number | lead-generation-agent | Owner (monitoring) | ✅ Required | Total returned from Apollo |
| `prospects_added` | number | lead-generation-agent | Owner (monitoring) | ✅ Required | Net new written to Prospects table |
| `prospects_skipped` | number | lead-generation-agent | Owner (monitoring) | ✅ Required | Duplicates filtered by dedup check |
| `status` | singleLineText | lead-generation-agent | Owner (monitoring) | ✅ Required | `success` or `error` |

**All 6 existing fields confirmed correct. No changes needed.**

**Decision for Kai:** Consider whether other workflows should also log to this table (e.g. outreach-agent logs emails sent per run, reporting-agent logs reports sent per run). Recommended: yes — extend this table to be a universal run log. Add `emails_queued` and `reports_sent` fields when those agents are built.

---

## Field Status Summary

| Category | Count | Status |
|---------|-------|--------|
| Existing Clients fields (confirmed correct) | 17 | ✅ No changes |
| Missing Clients fields (add now) | 5 | ⚠️ Add before next agent build |
| Proposed Clients fields (add before reporting/referral agents) | 10 | 📋 Kai to confirm |
| Existing Prospects fields (confirmed correct) | 10 | ✅ No changes |
| Proposed Prospects fields (add before outreach/lead qual agents) | 4 | 📋 Kai to confirm |
| Existing Automation Logs fields (confirmed correct) | 6 | ✅ No changes |
| **Total fields when complete** | **52** | |

---

## Decisions Needed from Kai

| # | Decision | Recommendation |
|---|---------|---------------|
| 1 | Add 5 missing Clients fields now? | **Yes — add now.** All required by agents already defined |
| 2 | Add 10 proposed reporting/referral Clients fields? | **Yes — add before building reporting-agent** |
| 3 | Add 4 proposed Prospects fields? | **Yes — add before building outreach-agent** |
| 4 | Should `lead_score_total` and `pre_call_brief` live on Prospects or Clients? | **Recommendation: Prospects only.** They are lead-stage data. `lead_score_grade` (already on Clients) is sufficient for delivery tracking |
| 5 | Extend Automation Logs table to cover outreach + reporting runs? | **Yes — recommended** but not urgent |
| 6 | New tables needed? | **No** — current 3 tables are sufficient for all 9 agents |

---

## Test Records (clean up before first real client)

| Record | Table | Airtable Record ID |
|--------|-------|--------------------|
| Status Test Client | Clients | `rec92eToEuIx06mJr` |
| Meridian Consulting Group | Clients | `rectfzSFPqjRQU4u1` |
