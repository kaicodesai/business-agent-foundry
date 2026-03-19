# Tool Manifest — onboarding-automation
Date: 2026-03-15

## Claude tools
Read, Write, Bash

## n8n nodes required
- Webhook trigger — receive payment confirmation — Status: AVAILABLE
- HTTP Request — n8n API: create workflow (credentials template) — Status: AVAILABLE
- ClickUp (Create Task / Create List) — create client project — Status: AVAILABLE
- Airtable (Update Record) — write project_status field — Status: AVAILABLE
- Send Email (SMTP) — send welcome email to client — Status: AVAILABLE
- Code node — credential scan on document content — Status: AVAILABLE
- IF node — validate required fields present — Status: AVAILABLE
- Set node — map fields between nodes — Status: AVAILABLE

## External APIs required
- n8n API — n8n-internal-api — Status: DEFERRED (API key not in env — verify before build)
- ClickUp API — clickup-phoenix-automation — Status: DEFERRED
- Airtable API — airtable-phoenix-automation — Status: DEFERRED
- Email/SMTP — smtp-phoenix-automation — Status: DEFERRED

## n8n workflow needed: YES
## Workflow build scope needed: YES

## Manifest verdict: DEFERRED (infrastructure credentials unverified — agent definition and SOP generated; workflow build scope generated; activate only after credentials confirmed)
