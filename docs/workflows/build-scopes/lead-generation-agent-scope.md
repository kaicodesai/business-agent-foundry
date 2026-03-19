# Workflow Build Scope — [PA] Lead Generation
Version: 1.0
Last updated: 2026-03-19
For: workflow-builder-agent

---

## Overview

Build an n8n workflow that runs daily at 06:45, queries Apollo.io for up to
100 ICP-matched prospects, deduplicates against Airtable, writes net-new
contacts to Airtable with `outreach_status = pending`, and logs a run
summary. This workflow feeds outreach-agent, which fires at 07:00.

---

## Trigger

- **Node type:** Schedule Trigger
- **Frequency:** Every day
- **Time:** 06:45 (owner local time — 15 minutes before outreach-agent)
- **Secondary trigger:** Manual Trigger node (for owner-initiated runs)

---

## Build Order

Build and test each node before proceeding to the next.

### Node 1 — Fetch ICP prospects (HTTP Request — Apollo.io)

**Type:** HTTP Request
**Credential:** `pa-apollo`
**Method:** POST
**URL:** `https://api.apollo.io/v1/mixed_people/search`
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Cache-Control": "no-cache"
}
```
**Body:**
```json
{
  "api_key": "{{ $credentials['pa-apollo'].api_key }}",
  "person_titles": [
    "Founder", "Co-Founder", "CEO", "COO",
    "Operations Manager", "Director of Operations", "Head of Operations"
  ],
  "organization_industry_tag_ids": [],
  "organization_num_employees_ranges": ["10,200"],
  "person_locations": ["United States", "Australia", "United Kingdom"],
  "page": 1,
  "per_page": 100
}
```
**Note to builder:** Apollo.io industry filter uses tag IDs, not plain text.
Look up the correct tag IDs for: E-commerce, Professional Services,
Healthcare, Logistics, Marketing Agency. Alternatively, use
`q_organization_industry_keywords` with plain text if tag IDs are
unavailable on the plan.

**Output:** Array of prospect objects under `people` key.

### Node 2 — Check for empty results (IF node)

**Type:** IF
**Condition:** `{{ $json.people.length > 0 }}`
**True branch:** Continue to Node 3
**False branch:** Route to Node 8 (Log empty run)

### Node 3 — Split into items (Code node)

**Type:** Code
**Purpose:** Convert the `people` array from the Apollo response into
individual n8n items, filtering out contacts with no email.
```javascript
const people = $input.first().json.people || [];
return people
  .filter(p => p.email && p.email.includes('@'))
  .map(p => ({
    json: {
      prospect_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      company_name: p.organization?.name || '',
      industry: p.organization?.industry || '',
      job_title: p.title || '',
      team_size: p.organization?.num_employees || null,
      email: p.email,
      linkedin_url: p.linkedin_url || null,
    }
  }));
```

### Node 4 — Loop over prospects (Loop Over Items)

**Batch size:** 1

### Node 5 — Check if prospect exists in Airtable (Airtable node)

**Type:** Airtable
**Credential:** `pa-airtable`
**Operation:** Search Records
**Table:** Prospects
**Filter by formula:** `{email} = '{{ $json.email }}'`
**Max records:** 1
**Fields to return:** `email`

### Node 6 — Route new vs existing (IF node)

**Type:** IF
**Condition:** `{{ $input.all().length === 0 }}`
*(True = no existing record found = new prospect)*
**True branch:** Node 7 (Write to Airtable)
**False branch:** Skip — continue loop (no action for existing records)

### Node 7 — Write new prospect to Airtable (Airtable node)

**Type:** Airtable
**Credential:** `pa-airtable`
**Operation:** Create Record
**Table:** Prospects
**Fields:**
- `prospect_name`: `{{ $('Loop over prospects').item.json.prospect_name }}`
- `company_name`: `{{ $('Loop over prospects').item.json.company_name }}`
- `industry`: `{{ $('Loop over prospects').item.json.industry }}`
- `job_title`: `{{ $('Loop over prospects').item.json.job_title }}`
- `team_size`: `{{ $('Loop over prospects').item.json.team_size }}`
- `email`: `{{ $('Loop over prospects').item.json.email }}`
- `linkedin_url`: `{{ $('Loop over prospects').item.json.linkedin_url }}`
- `outreach_status`: `pending`
- `source`: `apollo`
- `sourced_at`: `{{ $now.toISO() }}`

### Node 8 — Aggregate run stats (Code node)

**Type:** Code
**Purpose:** Calculate totals for the run summary log.
```javascript
const apolloCount = $('Fetch ICP prospects').first().json.people?.length || 0;
const added = $('Write new prospect to Airtable').all().length;
const skipped = apolloCount - added;
return [{
  json: {
    workflow: '[PA] Lead Generation',
    run_at: new Date().toISOString(),
    prospects_found: apolloCount,
    prospects_added: added,
    prospects_skipped: skipped,
  }
}];
```

### Node 9 — Log run summary to Airtable (Airtable node)

**Type:** Airtable
**Credential:** `pa-airtable`
**Operation:** Create Record
**Table:** automation_logs
**Fields:**
- `workflow`: `{{ $json.workflow }}`
- `run_at`: `{{ $json.run_at }}`
- `prospects_found`: `{{ $json.prospects_found }}`
- `prospects_added`: `{{ $json.prospects_added }}`
- `prospects_skipped`: `{{ $json.prospects_skipped }}`

---

## Error Handling

- Connect global error trigger to Phoenix Automation standard error-handling
  workflow (once built)
- Node 1 (Apollo API) failure: route to error workflow — this is a hard
  failure, no prospects to process
- Node 5 (Airtable dedup) failure: route to error workflow — do not write
  records without deduplication
- Node 7 (Airtable write) failure: non-blocking per-record — log error, skip
  record, continue loop
- Node 9 (log write) failure: non-blocking — log to n8n execution only

---

## Credentials

All credential references must use `pa-` prefixed named credentials from the
Phoenix Automation internal credential store. Do not hardcode API keys.

| Credential name | Type | Used by |
|----------------|------|---------|
| `pa-apollo` | HTTP Header Auth (`api_key`) | Node 1 |
| `pa-airtable` | Airtable Token API | Nodes 5, 7, 9 |

---

## Test Data

Before running end-to-end:
1. In Apollo.io UI, run the same ICP search manually and confirm it returns
   results. Note one test contact's email.
2. Confirm that test contact email does NOT exist in Airtable already.

**Expected test output:**
- Node 1 returns at least 1 prospect from Apollo
- Node 5 finds no existing Airtable record for the test contact
- Node 7 creates a new Airtable record with `outreach_status = pending`
- Node 9 writes a run log entry with `prospects_added >= 1`

After test: update the test Airtable record to `outreach_status = test-complete`
so outreach-agent does not process it.

---

## Expected Output (production)

Each daily run at 06:45 produces:
1. 30–100 new Airtable prospect records with `outreach_status = pending`
2. All records de-duplicated against existing Airtable data
3. Run summary log in `automation_logs` table
4. outreach-agent (firing at 07:00) picks up new records automatically
