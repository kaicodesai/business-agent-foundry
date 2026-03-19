# Tool Manifest — outreach-agent
Date: 2026-03-15

## Claude tools
None (runs entirely in n8n)

## n8n nodes required
- Schedule Trigger (cron) — daily batch trigger — Status: AVAILABLE
- Airtable (Search Records) — fetch pending prospects — Status: AVAILABLE
- IF node — filter already-contacted prospects — Status: AVAILABLE
- Loop Over Items — process each prospect — Status: AVAILABLE
- HTTP Request — Anthropic API for email copy — Status: AVAILABLE
- Instantly.ai (HTTP Request) — queue campaign — Status: AVAILABLE
- Airtable (Update Record) — log send status — Status: AVAILABLE
- Set node — field mapping — Status: AVAILABLE

## External APIs required
- Airtable API — airtable-phoenix-automation — Status: DEFERRED
- Anthropic API — anthropic-api — Status: DEFERRED
- Instantly.ai API — instantly-phoenix-automation — Status: DEFERRED

## n8n workflow needed: YES
## Workflow build scope needed: YES

## Manifest verdict: DEFERRED (credentials unverified — proceed with definition; activate after credentials confirmed)
