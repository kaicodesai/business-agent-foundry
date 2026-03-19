# Tool Manifest — reporting-agent
Date: 2026-03-15

## Claude tools
None (runs entirely in n8n)

## n8n nodes required
- Schedule Trigger (cron) — monthly trigger on 1st — Status: AVAILABLE
- Airtable (Search Records) — fetch retainer clients — Status: AVAILABLE
- IF node — filter active retainer clients — Status: AVAILABLE
- Loop Over Items — process each client — Status: AVAILABLE
- HTTP Request — n8n API to read execution logs — Status: AVAILABLE
- Code node — aggregate execution metrics — Status: AVAILABLE
- HTTP Request — Anthropic API for report generation — Status: AVAILABLE
- Send Email (SMTP) — send report to client — Status: AVAILABLE
- Airtable (Update Record) — log delivery and metrics — Status: AVAILABLE

## External APIs required
- Airtable API — airtable-phoenix-automation — Status: DEFERRED
- n8n internal API — n8n-internal-api — Status: DEFERRED
- Anthropic API — anthropic-api — Status: DEFERRED
- Email/SMTP — smtp-phoenix-automation — Status: DEFERRED

## n8n workflow needed: YES
## Workflow build scope needed: YES

## Manifest verdict: DEFERRED (credentials unverified — proceed with definition; activate after credentials confirmed)
