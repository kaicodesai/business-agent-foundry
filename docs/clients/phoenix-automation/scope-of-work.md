# Scope of Work — Phoenix Automation (Internal)

**Client:** Phoenix Automation (owner-operated internal account)
**Project type:** Internal agency infrastructure
**Agreed date:** 2026-03-16
**Owner:** Kai Edwards (kai@phoenixautomation.ai)

---

## Automation 1 — Onboarding Automation

**n8n workflow:** `[PA] Onboarding Automation` (ID: `Ro9IkQBlNaUxKR6B`)

### Trigger
POST webhook at `/webhook/payment-confirmed` — fired when a client payment is confirmed (Stripe or equivalent). Payload must include `client_name`, `client_email`, `payment_status: paid`.

### Steps automated
1. Validate incoming payload (client_name, client_email, payment_status)
2. Derive a URL-safe client slug from client_name
3. Look up the client record in Airtable by email
4. Create a new n8n project workspace scoped to the client
5. Read the client's scope-of-work tools list from Airtable
6. Create a credentials template workflow in the client's n8n workspace (one placeholder node per tool)
7. Create a ClickUp project list for the client in the delivery space
8. Update the Airtable client record with all generated IDs and set `project_status: onboarding.in_progress`
9. Send the owner an onboarding summary email with all IDs and next steps

### Expected outputs
- New n8n project workspace for client (ID stored in Airtable)
- Credentials template workflow in client workspace (ID stored in Airtable)
- ClickUp project list (ID stored in Airtable, non-blocking if ClickUp fails)
- Airtable record updated: `project_status`, `client_slug`, `n8n_workspace_id`, `n8n_credentials_template_id`, `clickup_project_id`, `onboarding_started_at`
- Owner email: full onboarding summary with all IDs and next-step instructions

### Tools / credentials required
- Airtable (pa-airtable / `43nJBFUUr3J9wX1Y`)
- n8n API (pa-n8n-api / `o5eIjNSB2LCpMKdO`)
- ClickUp (pa-clickup / `Sb40bHDhf930ydIw`)
- SMTP email (SMTP account / `Q7ahJEa5Tvt4iRHX`)

### Hardcoded configuration (n8n Variables unavailable — enterprise feature)
Per owner decision on 2026-03-16, the following values are hardcoded directly in node parameters as an approved substitute for n8n Variables (not available on this n8n instance):

| Variable | Value | Nodes |
|---|---|---|
| PA_AIRTABLE_BASE_ID | `appMLHig3CN7WW0iW` | Airtable Lookup, Read Scope, Update Record |
| PA_AIRTABLE_CLIENTS_TABLE_ID | `tblfvqqyYukRJQYmQYgdBXXCYhRqJ` | Airtable Lookup, Read Scope, Update Record |
| PA_CLICKUP_TEAM_ID | `90141018999` | Create ClickUp Project |
| PA_CLICKUP_SPACE_ID | `90144568071` | Create ClickUp Project |
| PA_OWNER_EMAIL | `kai@phoenixautomation.ai` | Send Onboarding Summary Email |

### Constraints and deferrals
- **Error workflow:** To be built as a follow-on task after core pipeline is validated. `settings.errorWorkflow` is intentionally empty until then.
- **End-to-end test:** Pending SMTP credential confirmation. Test payload and cleanup instructions documented in `build-log.md` Owner Review Item 6.
- **ClickUp failure:** Non-blocking — workflow continues with `clickup_project_id: null` if ClickUp creation fails.

---

## Out of scope (this engagement)
- Client-facing automation workflows (built separately per client)
- Status update emails, referral triggers, reporting (separate PA pipeline workflows)
- Error-handling workflow (follow-on task)
