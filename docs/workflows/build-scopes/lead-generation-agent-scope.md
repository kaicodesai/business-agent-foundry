# Workflow Build Scope — [PA] Lead Generation
Version: 2.0
Last updated: 2026-05-08
For: workflow-builder-agent
Source of truth: live n8n workflow `YO3f5CL9bYbLTBgw` (`[PA] Lead Generation`) as of 2026-05-08

---

## Overview

A daily Apollo.io sourcing pipeline with a two-stage reveal model:

1. **Search** Apollo for up to 100 ICP-matched contacts (verified emails only).
2. **Score and rank** results against a wellness regex (with exclude terms) into a top-50 candidate pool.
3. **Pre-reveal dedup** the candidate pool against Airtable Prospects by `apollo_person_id`, `linkedin_url`, and `email`.
4. **Reveal** up to 10 unseen candidates via Apollo `/people/bulk_match`.
5. **Post-reveal dedup** revealed contacts by email.
6. **Write** net-new prospects with `outreach_status = pending`. PATCH `apollo_person_id` onto existing records that are missing it (backfill).
7. **Log** a run summary to `automation_logs` and rotate the keyword/page state in workflow staticData.

This scope describes the live workflow. Every node here exists in production today and has been verified against the workflow JSON.

---

## Trigger

- **Schedule Trigger** — cron `45 6 * * *` (06:45 in the n8n instance's configured timezone — confirm before relying on owner-local time).
- **Manual Trigger** — for owner-initiated runs. Both triggers feed the same downstream Code node.

---

## Data flow (live node graph)

```
Schedule Trigger / Manual Trigger
        └─▶ Code in JavaScript (Init Run Context)
                └─▶ Fetch ICP Prospects (Apollo api_search)
                        └─▶ IF Apollo Fetch OK
                                ├─ true ─▶ Select Reveal Candidates
                                │           └─▶ Check Existing Search Candidates (Airtable)
                                │                   └─▶ Prepare Search Dedup Result
                                │                           └─▶ Build Reveal Payload
                                │                                   └─▶ Route Reveal Candidates
                                │                                           ├─ has reveals ─▶ Reveal Apollo Prospects
                                │                                           │                       └─▶ IF Apollo Reveal OK
                                │                                           │                               ├─ ok ─▶ Normalize Revealed Prospects
                                │                                           │                               │           └─▶ Check Prospect Exists1 (Airtable)
                                │                                           │                               │                   └─▶ Dedup and Prepare1
                                │                                           │                               │                           └─▶ Route New vs Existing1
                                │                                           │                               │                                   ├─ new ─▶ Write New Prospect1 ─▶ Aggregate Run Stats1
                                │                                           │                               │                                   └─ existing ─▶ IF Backfill Apollo ID
                                │                                           │                               │                                                       ├─ backfill ─▶ Backfill Apollo Person ID ─▶ Aggregate Run Stats1
                                │                                           │                               │                                                       └─ skip ─────────────────────────────▶ Aggregate Run Stats1
                                │                                           │                               └─ error ─▶ Handle Apollo Reveal Error ─▶ Log Apollo Error1
                                │                                           └─ no reveals ─────────────────────────────────────────────────────▶ Aggregate Run Stats1
                                │                                                                                                                       └─▶ Advance Page If Exhausted ─▶ Log Run Summary1
                                └─ false ─▶ Handle Apollo Error1 ─▶ Log Apollo Error1
```

---

## Node-by-node spec

### 1. Code in JavaScript (Init Run Context) — Code node

Reads `$getWorkflowStaticData('global')`, picks the next keyword from a 22-term wellness rotation list (does NOT increment the index here — that happens at the end), reads the saved page number per keyword, and emits the run context.

Outputs: `{ vertical, q_keywords, term_index, page, page_key, country, icp_sprint: 'health_wellness_5_20_us', reveal_limit: 10 }`.

Keyword rotation list (22 terms):
```
wellness, health coach, wellness coach, fitness coach, nutrition coach, fitness,
clinic, therapy, chiropractic, nutrition, medspa, yoga, pilates, massage,
aesthetics, counseling, naturopath, physio, wellbeing, holistic,
functional medicine, mental health
```

### 2. Fetch ICP Prospects — HTTP Request

- **Method:** POST
- **URL:** `https://api.apollo.io/api/v1/mixed_people/api_search`
- **Credential:** `pa-apollo-io` (HTTP Header Auth)
- **continueOnFail:** `true`
- **retryOnFail:** `true`, **maxTries:** 3, **waitBetweenTries:** 2000ms
- **Body:**
```json
{
  "page": "{{ $json.page || 1 }}",
  "per_page": 100,
  "person_titles": [
    "Founder", "Co-Founder", "Owner", "CEO", "COO", "President",
    "Clinic Owner", "Practice Owner", "Studio Owner", "Wellness Director",
    "Director of Operations", "Operations Manager", "General Manager",
    "Office Manager", "Practice Manager", "Client Care Manager"
  ],
  "include_similar_titles": true,
  "person_seniorities": ["owner", "founder", "c_suite", "head", "director", "manager"],
  "organization_num_employees_ranges": ["5,20"],
  "organization_locations": ["United States"],
  "person_locations": ["United States"],
  "contact_email_status": ["verified"],
  "q_keywords": "{{ $json.q_keywords }}"
}
```

### 3. IF Apollo Fetch OK — IF node

Condition: `Boolean(!$json.error && Array.isArray($json.people))`.
True → `Select Reveal Candidates`. False → `Handle Apollo Error1`.

### 4. Select Reveal Candidates — Code node

Scores Apollo results by:
- ICP title match (regex against title) — +3
- Wellness match (regex against company + industry + keywords + title) — +5
- Team size in 5–20 — +2
- Has email — +2
- Has company / industry / linkedin — +1 each

Wellness regex requires either a core term (`/health/`, `/wellness/`, `/fitness/`, `/clinic/`, `/therapy/`, `/therapist/`, `/chiropractic/`, `/nutrition/`, `/dietitian/`, `/med ?spa/`, `/yoga/`, `/pilates/`, `/massage/`, `/aesthetic/`, `/counseling|counselling/`, `/naturopath/`, `/physio/`, `/wellbeing/`, `/holistic/`, `/functional medicine/`, `/mental health/`, `/fertility/`) OR a coach phrase (`/health coach/`, `/wellness coach/`, etc.), AND must NOT match exclude terms (`/retail/`, `/real estate/`, `/travel/`, `/basketball/`, `/sports/`, `/plumbing/`, `/information technology/`, `/software/`, `/professional training/`, `/mba/`, `/sales coach/`, `/business coach/`).

Outputs the top-50 candidate pool plus an `OR(...)` Airtable filter formula concatenating `{apollo_person_id}=`, `{linkedin_url}=`, `{email}=` clauses for every candidate (single-quotes escaped).

### 5. Check Existing Search Candidates — HTTP Request (Airtable)

- **Method:** GET
- **URL:** `https://api.airtable.com/v0/appMLHig3CN7WW0iW/tbluEsKoQ2p49ktVq`
- **Credential:** `pa-airtable`
- **continueOnFail:** `true`
- **retryOnFail:** `true`, maxTries 3, waitBetweenTries 2000
- **Query params:** `filterByFormula={{ $json.airtable_filter_formula }}`, `maxRecords=100`, `fields[]=linkedin_url`, `fields[]=email`, `fields[]=apollo_person_id`

### 6. Prepare Search Dedup Result — Code node

Merges the candidate seed with the Airtable response. On error, returns `records: []` and flags `pre_reveal_dedup_failed: true` with the error message in `dedup_lookup_error`. This is the graceful-degradation node — when Airtable fails the workflow continues with no dedup rather than halting.

### 7. Build Reveal Payload — Code node

Builds Sets of seen `apollo_person_id`, `linkedin_url`, `email` (lowercased) from the dedup result. Filters the candidate pool to unseen, slices to `reveal_limit` (10), and emits Apollo bulk_match `details: [{id}]` plus `reveal_count`, `skipped_previously_seen`, `skip` flag and `skip_reason`.

### 8. Route Reveal Candidates — IF node

Condition: `Number($json.reveal_count || 0) > 0`.
True → `Reveal Apollo Prospects`. False → `Aggregate Run Stats1` (skip reveal entirely).

### 9. Reveal Apollo Prospects — HTTP Request

- **Method:** POST
- **URL:** `https://api.apollo.io/api/v1/people/bulk_match`
- **Credential:** `pa-apollo-io`
- **continueOnFail:** `true`
- **retryOnFail:** `true`, maxTries 3, waitBetweenTries 2000
- **Body:** `{ "details": <from Build Reveal Payload>, "reveal_personal_emails": true, "reveal_phone_number": false }`

### 10. IF Apollo Reveal OK — IF node

Condition: `Boolean(!$json.error && (Array.isArray($json.matches) || Array.isArray($json.people)))`.
True → `Normalize Revealed Prospects`. False → `Handle Apollo Reveal Error`.

### 11. Normalize Revealed Prospects — Code node

Maps each Apollo match into the Prospects schema. Falls back to candidate-pool data when Apollo returns a different `organization` (with name-similarity check). Filters out matches with no email. Emits `apollo_person_id`, `prospect_name`, `first_name`, `last_name`, `company_name`, `industry`, `job_title`, `team_size`, `email`, `linkedin_url`, plus run context (`vertical`, `apollo_search_page`, `icp_sprint`).

If zero matches return emails, emits a single skip-item with `skip: true, skip_reason: 'no_revealed_emails'`.

### 12. Check Prospect Exists1 — HTTP Request (Airtable)

- **Method:** GET
- **URL:** `https://api.airtable.com/v0/appMLHig3CN7WW0iW/tbluEsKoQ2p49ktVq`
- **Credential:** `pa-airtable`
- **continueOnFail:** `true`, retry 3 × 2000ms
- **filterByFormula:** `{email}='<escaped email>'` (single quotes escaped via `.replace(/'/g, "\\'")`)
- **maxRecords:** 1, **fields[]:** `email`

### 13. Dedup and Prepare1 — Code node

Pairs each Airtable dedup result with the corresponding Normalize prospect using a key-based lookup:
1. Build `byEmail` and `byApolloId` Maps from Normalize output.
2. For each dedup item, look up the prospect by email, then by apollo_person_id, then by `pairedItem.item` index, then by positional index as final fallback.
3. Compute `write_to_airtable = !skip && hasValidEmail && hasRequiredFields && !exists` (and not affected by dedup error).
4. Compute `backfill_apollo_person_id = exists && new prospect has apollo_person_id && existing record does not`.

Emits the prospect with these flags plus `existing_record_id`, `dedup_lookup_failed`, `skip_reason`.

### 14. Route New vs Existing1 — IF node

Condition: `String($json.write_to_airtable) === 'true'`.
True → `Write New Prospect1`. False → `IF Backfill Apollo ID`.

### 15. Write New Prospect1 — HTTP Request (Airtable)

- **Method:** POST
- **URL:** `https://api.airtable.com/v0/appMLHig3CN7WW0iW/tbluEsKoQ2p49ktVq`
- **Credential:** `pa-airtable`
- **retryOnFail:** `true`, maxTries 3, waitBetweenTries 2000
- **Body:**
```js
{ records: [{ fields: {
  apollo_person_id: $json.apollo_person_id || '',
  prospect_name: $json.prospect_name,
  company_name: $json.company_name,
  client_slug: ($json.company_name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  industry: $json.industry,
  job_title: $json.job_title,
  team_size: $json.team_size || 0,
  email: $json.email,
  linkedin_url: $json.linkedin_url || '',
  outreach_status: 'pending',
  source: 'apollo',
  sourced_at: new Date().toISOString()
} }] }
```

### 16. IF Backfill Apollo ID + Backfill Apollo Person ID

If `backfill_apollo_person_id === 'true'`, PATCH the existing record at `https://api.airtable.com/v0/appMLHig3CN7WW0iW/tbluEsKoQ2p49ktVq/<existing_record_id>` with `{ fields: { apollo_person_id: $json.apollo_person_id } }`. Else fall through to `Aggregate Run Stats1`. The backfill node has `continueOnFail: true`.

### 17. Aggregate Run Stats1 — Code node

Reads from `Fetch ICP Prospects`, `Build Reveal Payload`, `Dedup and Prepare1`, `Write New Prospect1` to compute:
- `prospects_found`: Apollo `people` length
- `prospects_added`: count of successful Airtable writes
- `prospects_skipped`: max of (found - added, prepared-and-skipped count, pre-seen + (reveals - added))
- `notes`: `'ICP <sprint> | vertical <v> | page <p> | candidate_pool <n> | revealed <n> | pre_seen <n> [| Skipped: <reasons>]'`
- `status`: `'completed'`

### 18. Advance Page If Exhausted — Code node

Always increments `staticData.health_wellness_term_index` by 1 (rotates to next keyword on next run). If `reveal_count === 0 && candidate_pool_count > 0` (i.e. all candidates already seen), also increments `staticData[page_key]` so the next run pulls a fresh Apollo page for that keyword.

### 19. Log Run Summary1 — HTTP Request (Airtable)

- **Method:** POST
- **URL:** `https://api.airtable.com/v0/appMLHig3CN7WW0iW/tblL7tDAh1KTLtwpt`
- **Credential:** `pa-airtable`
- **retryOnFail:** `true`, maxTries 3, waitBetweenTries 2000
- **Body fields:** `workflow`, `run_at`, `status`, `prospects_found`, `prospects_added`, `prospects_skipped`, `notes`

### 20. Error paths — Handle Apollo Error1 / Handle Apollo Reveal Error / Log Apollo Error1

`Handle Apollo Error1` (after `IF Apollo Fetch OK` false) and `Handle Apollo Reveal Error` (after `IF Apollo Reveal OK` false) both build an error log entry and feed `Log Apollo Error1`, which writes to `automation_logs` with `status: 'error: <message>'`. The reveal-error variant includes `notes` with the reveal stage context. The search-error variant does not write `notes`.

---

## Error handling summary

| Node | continueOnFail | retryOnFail | Failure path |
|------|----------------|-------------|--------------|
| Fetch ICP Prospects | ✅ | 3 × 2000ms | IF Apollo Fetch OK → Handle Apollo Error1 → Log Apollo Error1 |
| Check Existing Search Candidates | ✅ | 3 × 2000ms | Prepare Search Dedup Result returns empty records and flags failure; reveal proceeds without pre-reveal dedup |
| Reveal Apollo Prospects | ✅ | 3 × 2000ms | IF Apollo Reveal OK → Handle Apollo Reveal Error → Log Apollo Error1 |
| Check Prospect Exists1 | ✅ | 3 × 2000ms | Dedup and Prepare1 honors `dedup_lookup_failed`; record not written |
| Write New Prospect1 | — | 3 × 2000ms | Workflow halts after retries (intentional — surfaces hard schema errors) |
| Backfill Apollo Person ID | ✅ | 3 × 2000ms | Skipped silently on failure |
| Log Run Summary1 / Log Apollo Error1 | — | 3 × 2000ms | n8n execution log captures any final-stage failure |

A global error workflow (`errorWorkflow: JByknkdAgxRmDKp3`) catches unhandled failures.

---

## Credentials

| Credential name | Type | Used by |
|-----------------|------|---------|
| `pa-apollo-io` | HTTP Header Auth (`x-api-key`) | Fetch ICP Prospects, Reveal Apollo Prospects |
| `pa-airtable` | Airtable Token API (used here as HTTP Header `Authorization: Bearer ...`) | All Airtable HTTP nodes (5 read/write) |

All credential references must use `pa-` prefixed named credentials. Do not hardcode keys.

---

## Airtable schema dependencies

This workflow assumes the following fields exist on the live Prospects table (`tbluEsKoQ2p49ktVq`):
`apollo_person_id`, `prospect_name`, `company_name`, `client_slug`, `industry`, `job_title`, `team_size`, `email`, `linkedin_url`, `outreach_status`, `source`, `sourced_at`.

And on `automation_logs` (`tblL7tDAh1KTLtwpt`):
`workflow`, `run_at`, `status`, `prospects_found`, `prospects_added`, `prospects_skipped`, `notes`.

All verified present on 2026-05-08. See [docs/setup/airtable-structure.md](../../setup/airtable-structure.md).

---

## Static data (workflow-scoped)

The workflow persists rotation state in `$getWorkflowStaticData('global')`:

| Key | Type | Written by | Purpose |
|-----|------|-----------|---------|
| `health_wellness_term_index` | number | Advance Page If Exhausted | Index into the 22-term keyword rotation. Incremented every successful run |
| `apollo_page_<slug>` | number | Advance Page If Exhausted | Per-keyword Apollo search page. Incremented when a vertical's current page is exhausted (reveals=0, pool>0) |

Failed runs (Apollo search or reveal errors) do NOT increment these — the next run retries the same keyword and page.

---

## Behavioural caps

- Apollo search: max 100 raw results per run (`per_page: 100`).
- Candidate pool: top 50 by score (after wellness regex filter).
- Reveal: max 10 per run (`reveal_limit: 10`).
- Title pool: 16 ICP titles + Apollo's `include_similar_titles: true` expansion.
- Email filter: `contact_email_status: ["verified"]` (Apollo pre-filters non-verified emails out of search results).

---

## Test procedure (pre-activation)

1. In Apollo.io UI, run the same ICP search manually. Confirm at least 1 wellness contact returns.
2. Confirm one test contact's email does NOT exist in Airtable Prospects.
3. Trigger the workflow via Manual Trigger.
4. Verify in this order:
   - `Fetch ICP Prospects` returns ≥1 result (`people` array)
   - `Select Reveal Candidates` produces a non-zero candidate pool
   - `Check Existing Search Candidates` returns 200 (with or without records)
   - `Build Reveal Payload` has `reveal_count > 0` (assuming unseen candidates exist)
   - `Reveal Apollo Prospects` returns 200 with `matches` populated
   - `Write New Prospect1` creates the Airtable record
   - `Log Run Summary1` writes a row with `status: completed` and a non-empty `notes` field
5. Verify `staticData.health_wellness_term_index` advanced by 1 in the workflow's static data.
6. Set the test record's `outreach_status` to `test-complete` so outreach-agent skips it.

---

## Known limitations

- `status` field uses `'completed'` (success) or `'error: <message>'` (failure) — not the originally documented `success` / `error` enum. Filter accordingly when querying logs.
- Cron runs at `45 6 * * *` in the n8n instance's configured timezone, not necessarily owner-local. Confirm before relying on a specific local-time fire.
- Pre-reveal dedup degrades gracefully on Airtable failure: reveal credits may be spent on already-seen contacts during an Airtable outage. The post-reveal email dedup still catches most duplicates.
