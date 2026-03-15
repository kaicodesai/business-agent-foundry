# Agent Build Index
Generated: 2026-03-15
Agent builder run: 2026-03-15T00:00:00Z
Blueprint source: docs/blueprints/business-blueprint.json
Blueprint last updated: 2026-03-13
Blueprint status at run time: draft (owner confirmed to proceed)

---

## Build Results

| Agent ID | Definition | SOP | Workflow Scope | Manifest | Status |
|----------|-----------|-----|----------------|---------|--------|
| `onboarding-automation` | `.claude/agents/onboarding-automation.md` | `docs/sops/onboarding-automation-sop.md` | `docs/workflows/build-scopes/onboarding-automation-scope.md` | DEFERRED | GENERATED |
| `status-update-agent` | `.claude/agents/status-update-agent.md` | `docs/sops/status-update-agent-sop.md` | `docs/workflows/build-scopes/status-update-agent-scope.md` | DEFERRED | GENERATED |
| `proposal-drafting-agent` | `.claude/agents/proposal-drafting-agent.md` | `docs/sops/proposal-drafting-agent-sop.md` | N/A (Claude Code agent) | CLEAR | GENERATED |
| `outreach-agent` | `.claude/agents/outreach-agent.md` | `docs/sops/outreach-agent-sop.md` | `docs/workflows/build-scopes/outreach-agent-scope.md` | DEFERRED | GENERATED |
| `reporting-agent` | `.claude/agents/reporting-agent.md` | `docs/sops/reporting-agent-sop.md` | `docs/workflows/build-scopes/reporting-agent-scope.md` | DEFERRED | GENERATED |
| `referral-trigger-agent` | `.claude/agents/referral-trigger-agent.md` | `docs/sops/referral-trigger-agent-sop.md` | `docs/workflows/build-scopes/referral-trigger-agent-scope.md` | DEFERRED | GENERATED |

---

## Coverage Notes (agents not regenerated — already exist)

| Agent ID from blueprint | Covered by | Note |
|------------------------|-----------|------|
| `lead-qualifier-chatbot` | `.claude/agents/lead-qualification-agent.md` | Mode 1 (chatbot) |
| `lead-scorer` | `.claude/agents/lead-qualification-agent.md` | Mode 2 (Typeform scoring) |
| `build-agent` / `workflow-builder-agent` | `.claude/agents/workflow-builder-agent.md` | EXISTS — SKIPPED |
| `process-mapping-agent` | `.claude/agents/process-mapping-agent.md` | Delivery pipeline — out of scope |
| `automation-scoping-agent` | `.claude/agents/automation-scoping-agent.md` | Delivery pipeline — out of scope |
| `qa-agent` | `.claude/agents/qa-agent.md` | Delivery pipeline — out of scope |
| `blueprint-agent` | `.claude/agents/blueprint-agent.md` | Layer 1 — out of scope |
| `blueprint-validator` | `.claude/agents/blueprint-validator.md` | Layer 1 — out of scope |

---

## Deferred Items (DEFERRED manifest — not BLOCKED)

All five n8n workflow agents have DEFERRED manifest verdicts. This means the
agent definitions and SOPs are complete and correct, but external API
credentials could not be verified against the n8n credential store because
the n8n API key is not configured in the environment.

**This does not block generation.** It blocks activation.

| Agent ID | Unverified credentials | Resolution required before activation |
|----------|----------------------|--------------------------------------|
| `onboarding-automation` | n8n API, ClickUp API, Airtable API, SMTP | Add named credentials to Phoenix Automation n8n instance |
| `status-update-agent` | Airtable API, ClickUp API, Anthropic API, SMTP | Same |
| `outreach-agent` | Airtable API, Anthropic API, Instantly.ai API | Same + Instantly.ai API key |
| `reporting-agent` | Airtable API, n8n API, Anthropic API, SMTP | Same |
| `referral-trigger-agent` | Airtable API, Anthropic API, Instantly.ai API | Same + Instantly.ai API key |

**Required credential names (must match exactly in n8n):**

| Credential name | Used by |
|----------------|---------|
| `airtable-phoenix-automation` | All five n8n workflow agents |
| `anthropic-api` | status-update-agent, outreach-agent, reporting-agent, referral-trigger-agent |
| `n8n-internal-api` | onboarding-automation, reporting-agent |
| `clickup-phoenix-automation` | onboarding-automation, status-update-agent |
| `smtp-phoenix-automation` | onboarding-automation, status-update-agent, reporting-agent |
| `instantly-phoenix-automation` | outreach-agent, referral-trigger-agent |

---

## Owner Next Steps

Work through these in order. Do not skip to step 4 before completing steps 1–3.

### Step 1 — Review generated agent definitions

Read each `.claude/agents/[agent-id].md` file and confirm:
- The behaviour described matches your intended operating model
- The guardrails are appropriate
- The Airtable field names match your actual Airtable base structure
- The ClickUp project structure matches your workspace

Make any corrections directly to the files before proceeding.

### Step 2 — Set up credentials in n8n

In your Phoenix Automation n8n instance, create the following named credentials:

| Credential | What to configure |
|-----------|------------------|
| `airtable-phoenix-automation` | Airtable API key → your Phoenix Automation base |
| `anthropic-api` | Anthropic API key |
| `n8n-internal-api` | n8n API key from n8n settings |
| `clickup-phoenix-automation` | ClickUp API key → your workspace |
| `smtp-phoenix-automation` | Your email SMTP credentials |
| `instantly-phoenix-automation` | Instantly.ai API key |

### Step 3 — Build n8n workflows via workflow-builder-agent

Pass each workflow build scope to workflow-builder-agent **in this exact order:**

1. `docs/workflows/build-scopes/onboarding-automation-scope.md` — build and test first
2. `docs/workflows/build-scopes/status-update-agent-scope.md`
3. `docs/workflows/build-scopes/outreach-agent-scope.md`
4. `docs/workflows/build-scopes/reporting-agent-scope.md`
5. `docs/workflows/build-scopes/referral-trigger-agent-scope.md`

Each scope must pass QA (qa-agent) before moving to the next.

### Step 4 — Verify onboarding-automation end-to-end before first client

Run onboarding-automation with a test payment payload (see scope test data).
Confirm: workspace created, credentials template created, ClickUp project
created, Airtable updated, owner email received. Delete all test artefacts
after confirming.

**Do not take a real client through this pipeline until this test passes.**

### Step 5 — Verify status-update-agent before any client goes live

Send a test run of status-update-agent to your own email address with a
test ClickUp project. Confirm the generated email is accurate and correctly
formatted. Only then enable the Monday cron for production.

**Do not mark any client project as `live` in Airtable until this test passes.**

### Step 6 — Resolve Airtable field names

The workflow scopes use field names as written in the agent definitions.
Confirm your Airtable base uses these exact field names, or update the
n8n workflow nodes to match your actual field names:

- `project_status`
- `client_slug`
- `n8n_workflow_ids`
- `clickup_project_id`
- `n8n_workspace_id`
- `service_tier`
- `project_launch_date`
- `referral_sequence_sent`
- `outreach_status`
- `hours_saved_per_run`
- `automations_delivered`
- `last_report_sent_at`
- `last_month_time_saved_hrs`

### Step 7 — Update blueprint status

Once agents are live and tested, update `docs/blueprints/business-blueprint.json`
`meta.status` from `"draft"` to `"approved"`.
