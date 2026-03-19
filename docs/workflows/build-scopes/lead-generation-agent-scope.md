# Workflow Build Scope — lead-generation-agent
Version: 1.0
Last updated: 2026-03-17
For: workflow-builder-agent

---

## Workflow Name

**[PA] Lead Generation Agent**

---

## Overview

Build an n8n workflow that runs daily at 06:00, fetches up to 100 verified-email
ICP-matching contacts from Apollo.io People Search, deduplicates against Airtable,
enriches each contact with org-level tech stack data via Apollo Org Enrich, scores
each lead 0–8 using claude-haiku-4-5, and creates a scored Airtable record for
every lead. Grade A (6–8) and Grade B (3–5) leads are written with
`outreach_status = pending` for outreach-agent to pick up. Grade C leads are
written with `outreach_status = disqualified`.

Must complete before outreach-agent's 07:00 trigger. Build in n8n Phoenix
Automation workspace.

---

## Trigger

- **Node type:** Schedule Trigger
- **Frequency:** Every day
- **Time:** 06:00 (owner local time)

---

## Build Order

### Node 1 — Fetch ICP-matching prospects (HTTP Request — Apollo People Search)

**Type:** HTTP Request
**URL:** `https://api.apollo.io/v1/mixed_people/search`
**Credential:** `pa-apollo-io`
**Method:** POST
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
  "api_key": "{{ $credentials.apollo_phoenix_automation.api_key }}",
  "person_titles": [
    "Founder",
    "Owner",
    "CEO",
    "COO",
    "Operations Manager",
    "Director of Operations",
    "Head of Operations",
    "VP of Operations",
    "VP Operations"
  ],
  "organization_num_employees_ranges": ["10,200"],
  "contact_email_status": ["verified"],
  "q_organization_industry_tag_ids": [],
  "q_keywords": "e-commerce OR \"professional services\" OR healthcare OR logistics OR \"marketing agency\"",
  "per_page": 100,
  "page": 1
}
```

**Note to builder:** Apollo.io uses API key in the request body, not as a Bearer
token. Verify the current Apollo API v1 authentication method in their docs.
The `q_organization_industry_tag_ids` array requires Apollo-specific integer IDs —
confirm the correct IDs for target industries from the Apollo tag library, or use
`q_keywords` as the industry filter fallback shown above.

**Extract from response:** `people` array. Each item has:
`name`, `first_name`, `last_name`, `email`, `title`, `organization.name`,
`organization.industry`, `organization.estimated_num_employees`,
`organization.website_url`, `organization.primary_domain`, `id`

### Node 2 — Check for results (IF node)

**Condition:** `{{ $json.people.length > 0 }}`
**False branch:** Exit cleanly — no prospects returned. Log:
`no_results_from_apollo` (Set node → connect to no-op end).

### Node 3 — Loop over prospects (Loop Over Items)

**Input:** `people` array from Node 1 response
**Batch size:** 1

### Node 4 — Check for existing Airtable record (Airtable)

**Type:** Airtable
**Operation:** Search Records
**Credential:** `pa-airtable`
**Base:** pa-airtable base ID (confirm with owner before build)
**Table:** Prospects
**Filter by formula:** `{email} = '{{ $json.email }}'`
**Max records:** 1

### Node 5 — Skip if existing (IF node)

**Condition:** `{{ $json.records.length === 0 }}`
**False branch (record exists):** Continue loop — do not create duplicate.
Connect false branch back to Loop node input to advance to next iteration.
**True branch (new prospect):** Continue to Node 6.

### Node 6 — Enrich org with Apollo (HTTP Request — Apollo Org Enrich)

**Type:** HTTP Request
**URL:** `https://api.apollo.io/v1/organizations/enrich`
**Credential:** `pa-apollo-io`
**Method:** GET
**Query parameters:**
```
api_key: {{ $credentials.apollo_phoenix_automation.api_key }}
domain: {{ $('Loop over prospects').item.json.organization.primary_domain }}
```

**Extract from response:**
- `organization.current_technologies` — array of `{ name, category }` objects
- `organization.keywords` — string array
- `organization.estimated_annual_revenue` — string

**If enrich call fails or returns empty technologies:** Do not stop. Use an empty
array for technologies and proceed. Set `tech_stack_raw = ""` in a Set node.

### Node 7 — Merge prospect + enrichment data (Set node)

Combine People Search fields and Org Enrich fields into a single item:

```
prospect_name:     {{ $('Loop over prospects').item.json.name }}
first_name:        {{ $('Loop over prospects').item.json.first_name }}
email:             {{ $('Loop over prospects').item.json.email }}
job_title:         {{ $('Loop over prospects').item.json.title }}
company_name:      {{ $('Loop over prospects').item.json.organization.name }}
industry:          {{ $('Loop over prospects').item.json.organization.industry }}
team_size:         {{ $('Loop over prospects').item.json.organization.estimated_num_employees }}
company_domain:    {{ $('Loop over prospects').item.json.organization.primary_domain }}
apollo_person_id:  {{ $('Loop over prospects').item.json.id }}
technologies:      {{ $json.organization.current_technologies.map(t => t.name).join(', ') }}
org_keywords:      {{ $json.organization.keywords.join(', ') }}
```

### Node 8 — Score lead with Claude (HTTP Request — Anthropic API)

**Type:** HTTP Request
**URL:** `https://api.anthropic.com/v1/messages`
**Credential:** `pa-anthropic`
**Method:** POST
**Body:**
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 300,
  "messages": [{
    "role": "user",
    "content": "You are a lead scoring agent for Phoenix Automation, an AI workflow automation agency. Score the following prospect 0–8 across four dimensions. Return only valid JSON — no other text.\n\nProspect:\n- Name: {{ $json.prospect_name }}\n- Job title: {{ $json.job_title }}\n- Company: {{ $json.company_name }}\n- Industry: {{ $json.industry }}\n- Employees: {{ $json.team_size }}\n- Technologies in use: {{ $json.technologies }}\n- Company keywords: {{ $json.org_keywords }}\n\nScoring dimensions (0–2 each):\n1. Industry fit: 2=core ICP (e-commerce, professional services, healthcare, logistics, marketing agency), 1=adjacent (retail, real estate, education, SaaS), 0=out of ICP (consumer, non-profit, government, solo operator)\n2. Team size fit: 2=10–200 employees, 1=5–9 or 201–500, 0=less than 5 or more than 500\n3. Role fit: 2=founder/owner/CEO/COO/operations manager/director of operations, 1=other manager or director, 0=junior or unknown\n4. Tech stack pain signals: 2=disconnected or manual-heavy stack (spreadsheets, legacy tools, multiple unintegrated SaaS, no visible automation), 1=partial automation (some tools but likely manual hand-offs), 0=modern integrated stack with visible automation\n\nGrade: A=6–8, B=3–5, C=0–2\n\nReturn this JSON only:\n{\"industry_score\":0,\"team_size_score\":0,\"role_score\":0,\"tech_stack_score\":0,\"total_score\":0,\"grade\":\"C\",\"scoring_notes\":\"one sentence\"}"
  }]
}
```

**Parse:** Extract `content[0].text` and parse as JSON.

**Error handling for this node:**
If parse fails or response is not valid JSON: set all scores to 0, grade to C,
`outreach_status = error`, `scoring_notes = "Scoring failed — JSON parse error"`.
Do not stop the loop — log the error and continue.

### Node 9 — Set grade and outreach_status (Set node)

```
lead_score_total:   {{ $json.total_score }}
lead_score_grade:   {{ $json.grade }}
industry_score:     {{ $json.industry_score }}
team_size_score:    {{ $json.team_size_score }}
role_score:         {{ $json.role_score }}
tech_stack_score:   {{ $json.tech_stack_score }}
scoring_notes:      {{ $json.scoring_notes }}
outreach_status:    {{ ['A','B'].includes($json.grade) ? 'pending' : 'disqualified' }}
scored_at:          {{ $now.toISO() }}
```

### Node 10 — Create Airtable record (Airtable)

**Type:** Airtable
**Operation:** Create Record
**Credential:** `pa-airtable`
**Base:** pa-airtable base ID
**Table:** Prospects
**Fields:**
```
prospect_name:        {{ $('Set merged data').item.json.prospect_name }}
email:                {{ $('Set merged data').item.json.email }}
job_title:            {{ $('Set merged data').item.json.job_title }}
company_name:         {{ $('Set merged data').item.json.company_name }}
industry:             {{ $('Set merged data').item.json.industry }}
team_size:            {{ $('Set merged data').item.json.team_size }}
technologies:         {{ $('Set merged data').item.json.technologies }}
lead_source:          apollo-outbound
lead_score_total:     {{ $json.lead_score_total }}
lead_score_grade:     {{ $json.lead_score_grade }}
industry_score:       {{ $json.industry_score }}
team_size_score:      {{ $json.team_size_score }}
role_score:           {{ $json.role_score }}
tech_stack_score:     {{ $json.tech_stack_score }}
scoring_notes:        {{ $json.scoring_notes }}
outreach_status:      {{ $json.outreach_status }}
scored_at:            {{ $json.scored_at }}
apollo_person_id:     {{ $('Set merged data').item.json.apollo_person_id }}
```

---

## Error Handling

- **Global:** Connect to Phoenix Automation error-handling workflow.
- **Node 6 (Org Enrich fails):** Non-blocking — if Apollo returns 4xx/5xx,
  use empty string for `technologies` and continue to Node 7. Do not stop the loop.
- **Node 8 (Claude scoring fails or returns malformed JSON):** Non-blocking —
  set `outreach_status = error` and `scoring_notes = "Scoring failed"` in Node 9,
  create the Airtable record anyway, continue loop.
- **Node 10 (Airtable create fails):** Blocking for this prospect — route to
  error workflow. Log: workflow name, prospect email, error message, timestamp.
  Notify owner via email.
- **Node 2 false branch (no results):** Clean exit — not an error. No alert needed.

---

## Credentials

| Credential name | Used by |
|----------------|---------|
| `pa-apollo-io` | Nodes 1, 6 |
| `pa-anthropic` | Node 8 |
| `pa-airtable` | Nodes 4, 10 |

---

## Airtable Schema — Prospects Table

Confirm the following fields exist in the Prospects table before building.
Create any missing fields before the first test run:

| Field name | Type | Notes |
|-----------|------|-------|
| `prospect_name` | Single line text | |
| `email` | Email | Primary dedup key |
| `job_title` | Single line text | |
| `company_name` | Single line text | |
| `industry` | Single line text | |
| `team_size` | Number | Integer |
| `technologies` | Long text | Comma-separated |
| `lead_source` | Single line text | "apollo-outbound" |
| `lead_score_total` | Number | 0–8 |
| `lead_score_grade` | Single select | A, B, C |
| `industry_score` | Number | 0–2 |
| `team_size_score` | Number | 0–2 |
| `role_score` | Number | 0–2 |
| `tech_stack_score` | Number | 0–2 |
| `scoring_notes` | Long text | Claude rationale |
| `outreach_status` | Single select | pending, disqualified, in_sequence, replied, closed, error |
| `scored_at` | Date/time | ISO 8601 |
| `apollo_person_id` | Single line text | Apollo unique ID |

**Note:** `outreach_status` is shared with outreach-agent. Do not rename or
restructure this field — outreach-agent filters on `outreach_status = pending`.

---

## Test Data

**Before enabling daily cron, run a manual test with 5 records:**

1. Set `per_page: 5` in Node 1 body temporarily.
2. Execute the workflow manually.
3. Verify in Airtable:
   - 5 records created (or fewer if duplicates were filtered)
   - Each record has a complete score (4 dimension scores + total + grade)
   - Grade A/B records show `outreach_status = pending`
   - Grade C records show `outreach_status = disqualified`
   - No records show `outreach_status = error`
4. Check that outreach-agent picks up the `pending` records on its next run
   (or manually trigger outreach-agent against the test records).

**After test:** Reset `per_page` to 100 before activating daily cron.

---

## Expected Output (production)

Each daily run at 06:00:
1. Up to 100 ICP-matching prospects fetched from Apollo.io
2. Existing prospects skipped (no duplicates in Airtable)
3. Each new prospect enriched with org tech stack data
4. Each new prospect scored 0–8 by claude-haiku-4-5
5. All new prospects logged to Airtable with full scoring breakdown
6. Grade A and B prospects available with `outreach_status = pending` by 06:30
7. outreach-agent picks up pending prospects at 07:00 and queues email campaigns

---

## Owner Confirmation Before Activation

- [ ] Apollo API key has People Search and Org Enrich access — test with a
  manual API call before building
- [ ] Airtable Prospects table has all required fields (see schema above)
- [ ] Apollo search filters reviewed and confirmed against current ICP
- [ ] Test run of 5 records completed and output reviewed
- [ ] outreach-agent confirmed to be reading from same Airtable base and table
- [ ] Daily cron timing confirmed: lead-generation-agent at 06:00,
  outreach-agent at 07:00 — lead-generation-agent must complete before
  outreach-agent runs
