# Tool Manifest — status-update-agent
Date: 2026-03-15

## Claude tools
None (this agent runs entirely in n8n)

## n8n nodes required
- Schedule Trigger (cron) — weekly Monday trigger — Status: AVAILABLE
- Airtable (Search Records) — get active clients — Status: AVAILABLE
- ClickUp (Get Tasks) — read project tasks — Status: AVAILABLE
- Claude AI node (or HTTP Request to Anthropic API) — generate email copy — Status: AVAILABLE
- Send Email (SMTP) — send status email to client — Status: AVAILABLE
- Airtable (Update Record) — log send timestamp — Status: AVAILABLE
- IF node — filter active clients only — Status: AVAILABLE
- Loop Over Items — process each client — Status: AVAILABLE

## External APIs required
- Airtable API — airtable-phoenix-automation — Status: DEFERRED
- ClickUp API — clickup-phoenix-automation — Status: DEFERRED
- Anthropic API — anthropic-api — Status: DEFERRED
- Email/SMTP — smtp-phoenix-automation — Status: DEFERRED

## n8n workflow needed: YES
## Workflow build scope needed: YES

## Manifest verdict: DEFERRED (credentials unverified — generate definition and scope; activate after credentials confirmed)
