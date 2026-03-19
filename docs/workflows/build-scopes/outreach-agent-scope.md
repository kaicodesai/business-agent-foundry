# Workflow Build Scope — outreach-agent
Version: 1.0
Last updated: 2026-03-15
For: workflow-builder-agent

---

## Overview

Build an n8n workflow that runs daily, fetches up to 50 pending prospects
from Airtable, generates personalised cold emails + 3-step follow-up sequences
via Claude, queues each campaign in Instantly.ai, and logs send status back
to Airtable.

---

## Trigger

- **Node type:** Schedule Trigger
- **Frequency:** Every day
- **Time:** 07:00 (owner local time — before sending windows open)

---

## Build Order

### Node 1 — Fetch pending prospects (Airtable node)

**Type:** Airtable
**Credential:** `airtable-phoenix-automation`
**Operation:** Search Records
**Table:** Prospects
**Filter by formula:** `AND({outreach_status} = 'pending', {email} != '')`
**Max records:** 50
**Fields to return:** `prospect_name`, `company_name`, `industry`, `job_title`,
`team_size`, `email`, `record_id`

### Node 2 — Check for pending prospects (IF node)

**Condition:** Count of items > 0
**False branch:** Exit cleanly with log `no_pending_prospects`

### Node 3 — Loop over prospects (Loop Over Items)

**Batch size:** 1

### Node 4 — Generate email sequence (HTTP Request — Anthropic API)

**Type:** HTTP Request
**URL:** `https://api.anthropic.com/v1/messages`
**Credential:** `anthropic-api`
**Method:** POST
**Body:**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 600,
  "messages": [{
    "role": "user",
    "content": "Write a 3-email cold outreach sequence for Phoenix Automation.\n\nProspect: {{ $json.prospect_name }}, {{ $json.job_title }} at {{ $json.company_name }}\nIndustry: {{ $json.industry }}\nTeam size: {{ $json.team_size }}\n\nEmail 1 (initial contact, under 100 words):\n- Open with a specific credible observation about their industry\n- One sentence on Phoenix Automation: 'We build AI automations for [industry] businesses that eliminate the manual tasks your team repeats every day.'\n- Ask if they have a specific pain common in their industry\n- CTA: free 30-minute assessment via Calendly\n- Sign off as [Owner Name], Phoenix Automation\n\nEmail 2 (day 3 follow-up, under 75 words):\n- Reference the prior email briefly\n- Add one new angle (time savings, no lock-in, or free assessment)\n- Repeat CTA\n\nEmail 3 (day 7 follow-up, under 60 words):\n- Light final follow-up\n- One sentence close\n- Repeat CTA\n\nFormat your response as JSON:\n{\"email_1\": \"...\", \"email_2\": \"...\", \"email_3\": \"...\"}\n\nNo subject lines. No emojis. No 'I hope this email finds you well.'"
  }]
}
```
**Parse:** Extract `content[0].text`, parse as JSON → `email_1`, `email_2`, `email_3`

### Node 5 — Queue campaign in Instantly.ai (HTTP Request)

**Type:** HTTP Request
**URL:** `https://api.instantly.ai/api/v1/lead/add` (verify current Instantly API version)
**Credential:** `instantly-phoenix-automation`
**Method:** POST
**Body:** Add prospect with email sequence. Structure per Instantly.ai API docs.

Key fields:
- `email`: `{{ $json.email }}`
- `first_name`: `{{ $json.prospect_name.split(' ')[0] }}`
- `company_name`: `{{ $json.company_name }}`
- `personalization`: `{{ $json.email_1 }}` (used as first email body)

**Note to builder:** Instantly.ai API structure may require creating a
campaign first and then adding leads to it. Verify the current Instantly
API documentation and implement accordingly. The key requirement is that
the 3-email sequence is queued with correct timing (Day 0, Day 3, Day 7).

### Node 6 — Update Airtable (Airtable node)

**Type:** Airtable
**Operation:** Update Record
**Record ID:** `{{ $json.record_id }}`
**Fields:**
- `outreach_status`: `in_sequence`
- `outreach_started_at`: `{{ $now.toISO() }}`
- `instantly_campaign_id`: campaign ID from Node 5 response

---

## Error Handling

- Global: connect to Phoenix Automation error-handling workflow
- Per-prospect (Node 4 or 5 fails): non-blocking — skip prospect, log error,
  set `outreach_status = error` in Airtable for that record, continue loop
- Error workflow: log to Airtable errors table, notify owner via email

---

## Credentials

| Credential name | Used by |
|----------------|---------|
| `airtable-phoenix-automation` | Nodes 1, 6 |
| `anthropic-api` | Node 4 |
| `instantly-phoenix-automation` | Node 5 |

---

## Test Data

Add one test prospect to Airtable with `outreach_status = pending`:
```
prospect_name: Test Prospect
company_name: Acme Test Co
industry: E-commerce
job_title: Operations Manager
team_size: 25
email: [owner test email address]
```

Expected test output:
- Claude generates 3 personalised emails referencing e-commerce industry
- Instantly.ai campaign created (or added to test campaign)
- Airtable `outreach_status` updated to `in_sequence`
- Owner receives the 3-email sequence to their test inbox

After test: cancel Instantly.ai test campaign; update Airtable test record
`outreach_status = test-complete`.

---

## Expected Output (production)

Each daily run processes up to 50 pending prospects:
1. 3-email sequence queued in Instantly.ai per prospect
2. Airtable `outreach_status = in_sequence` for all processed records
3. Clean n8n execution log
