# Tool Manifest — referral-trigger-agent
Date: 2026-03-15

## Claude tools
None (runs entirely in n8n)

## n8n nodes required
- Schedule Trigger (cron) — daily date check — Status: AVAILABLE
- Airtable (Search Records) — find clients at 30-day mark — Status: AVAILABLE
- IF node — check referral_sequence_sent flag — Status: AVAILABLE
- Loop Over Items — process each qualifying client — Status: AVAILABLE
- HTTP Request — Anthropic API for sequence generation — Status: AVAILABLE
- HTTP Request — Instantly.ai API to queue campaign — Status: AVAILABLE
- Airtable (Update Record) — set referral_sequence_sent flag — Status: AVAILABLE
- Set node — field mapping — Status: AVAILABLE

## External APIs required
- Airtable API — airtable-phoenix-automation — Status: DEFERRED
- Anthropic API — anthropic-api — Status: DEFERRED
- Instantly.ai API — instantly-phoenix-automation — Status: DEFERRED

## n8n workflow needed: YES
## Workflow build scope needed: YES

## Manifest verdict: DEFERRED (credentials unverified — proceed with definition; activate after credentials confirmed)
