# Workflow Build Scope — referral-trigger-agent
Version: 1.0
Last updated: 2026-03-15
For: workflow-builder-agent

---

## Overview

Build an n8n workflow that runs daily, checks for clients who hit the 30-day
mark since project launch, generates a 2-touch referral email sequence via
Claude, queues it in Instantly.ai, and sets a one-time-send flag in Airtable.

---

## Trigger

- **Node type:** Schedule Trigger
- **Frequency:** Every day
- **Time:** 08:00 (owner local time)

---

## Build Order

### Node 1 — Find 30-day clients (Airtable)

**Credential:** `airtable-phoenix-automation`
**Filter by formula:**
```
AND(
  {project_status} = 'live',
  {referral_sequence_sent} = FALSE(),
  DATETIME_DIFF(TODAY(), {project_launch_date}, 'days') = 30
)
```
**Fields:** `client_name`, `client_email`, `company_name`, `automations_delivered`,
`last_month_time_saved_hrs`, `record_id`

**IF after:** count = 0 → exit cleanly.

### Node 2 — Loop over qualifying clients (Loop Over Items)

**Batch size:** 1

### Node 3 — Check automations_delivered (IF node)

**Condition:** `automations_delivered` is not empty
**False branch:** Skip client. Update Airtable `referral_sequence_sent = true`
(to prevent infinite daily re-check) and add to owner flag list.

### Node 4 — Generate referral sequence (HTTP Request — Anthropic API)

**URL:** `https://api.anthropic.com/v1/messages`
**Credential:** `anthropic-api`
**Body:**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 400,
  "messages": [{
    "role": "user",
    "content": "Write a 2-touch referral request email sequence for a satisfied client of Phoenix Automation.\n\nClient: {{ $json.client_name }} at {{ $json.company_name }}\nAutomations we built: {{ $json.automations_delivered }}\nTime saved per month: {{ $json.last_month_time_saved_hrs || 'several' }} hours\nDays since launch: 30\n\nEmail 1 (send today, under 80 words):\n- Open by referencing one specific automation we built for them\n- Ask if they know another founder or ops manager with similar manual process problems\n- Include a Calendly link: [CALENDLY_LINK]\n- Warm, not salesy\n\nEmail 2 (send day 7, under 60 words):\n- Gentle follow-up — acknowledge they're busy\n- One sentence: 'A 30-minute call is free and they'll leave with a clear automation roadmap'\n- Repeat Calendly link\n\nFormat as JSON: {\"email_1\": \"...\", \"email_2\": \"...\"}\nSign both as [Owner Name], Phoenix Automation. No emojis."
  }]
}
```
**Parse:** `content[0].text` → JSON → `email_1`, `email_2`

**Post-process:** Replace `[CALENDLY_LINK]` with owner's actual Calendly URL
(hardcode in a Set node or store in a settings record in Airtable).

### Node 5 — Queue campaign in Instantly.ai (HTTP Request)

**Credential:** `instantly-phoenix-automation`
Queue `email_1` as initial send, `email_2` as day-7 follow-up.
See Instantly.ai API docs for campaign/lead structure.

### Node 6 — Set referral flag in Airtable (Airtable)

**Operation:** Update Record
**Record ID:** `{{ $json.record_id }}`
**Fields:**
- `referral_sequence_sent`: `true`
- `referral_sequence_sent_at`: `{{ $now.toISO() }}`
- `instantly_referral_campaign_id`: campaign ID from Node 5

---

## Error Handling

- Global: connect to Phoenix Automation error-handling workflow
- Node 5 failure (Instantly queue fail): route to error workflow — do NOT set
  `referral_sequence_sent = true` if the sequence was not successfully queued
- Node 3 false branch: non-blocking — set flag, flag owner, continue loop

---

## Credentials

| Credential name | Used by |
|----------------|---------|
| `airtable-phoenix-automation` | Nodes 1, 6 |
| `anthropic-api` | Node 4 |
| `instantly-phoenix-automation` | Node 5 |

---

## Test Data

Set one Airtable client record with:
- `project_status = live`
- `project_launch_date` = today minus 30 days
- `referral_sequence_sent = false`
- `automations_delivered = "Shopify-to-Xero order sync, Lead qualifier chatbot"`

Expected output:
- Claude generates two warm referral emails referencing Shopify-to-Xero sync
- Campaign queued in Instantly.ai to owner's test email address
- Airtable `referral_sequence_sent = true`

After test: cancel Instantly.ai test campaign; confirm Airtable flag is set.

---

## Important Note on Calendly Link

The workflow must have a mechanism to insert the owner's Calendly URL into
both emails. Recommended approach: store the URL in a dedicated Airtable
"settings" record or a Set node at the start of the workflow, and reference
it in the Claude prompt.

Builder: confirm with owner where to store this value before building Node 4.
