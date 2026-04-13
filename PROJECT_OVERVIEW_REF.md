# PROJECT_OVERVIEW.md
> **Version:** 4.7 — Last updated: 2026-04-10 — Updated by: Kai + Claude

---

> ## AGENT INSTRUCTIONS — READ THIS FIRST
>
> **At the start of every session:**
> 1. Read this entire file before doing anything else
> 2. Use the API credentials, table IDs, field names, and workflow IDs here as ground truth — do not guess or fetch from external sources unless this file says a value is missing
> 3. Check Current Status before building anything — do not rebuild what already exists
> 4. Run the smoke test to confirm your environment is connected
>
> **At the end of every session:**
> 1. Update this file ONCE at the end of the session — not after every task
> 2. Update **Known Issues** — resolve fixed ones, add new ones
> 3. Update **TODO / Roadmap** — check off completed items
> 4. Fill in the **Session Handoff** section at the bottom
> 5. Commit and push:
> ```bash
> git add PROJECT_OVERVIEW.md
> git commit -m "Update PROJECT_OVERVIEW.md — [brief description]"
> git push origin main
> ```
>
> **Never:**
> - Delete existing Change Log entries
> - Overwrite credential values with placeholders
> - Rebuild a workflow or file that already exists without owner confirmation
> - Activate any workflow in n8n — activation is always Kai's decision
> - Commit API keys or .mcp.json to the repo

---

# Project Overview

**Project Name:** Business Agent Foundry — Phoenix Automation (First Live Implementation)

**Purpose:**
A system that generates fully operational business agents, workflows, SOPs, and operating systems from a structured business blueprint with minimal founder input. Phoenix Automation is the first live test case: an AI automation agency that delivers n8n workflow automation to small business clients.

**Problem It Solves:**
Building an AI automation agency requires hundreds of hours of manual setup. This system automates the entire operating layer — lead generation, qualification, onboarding, build, QA, reporting — so the founder focuses on sales and delivery quality, not operations.

**Team:**
| Person | Role | Contact |
|--------|------|---------|
| Kai Edwards | Founder — reviews, approves, activates | lightofkai777@gmail.com |
| Haris | VA — builds and tests under Kai's direction | — |

---

# Ownership & Responsibility

| Task Type | Owner | Notes |
|-----------|-------|-------|
| Workflow activation in n8n | Kai only | Never activated by Haris or agents |
| Proposal sending | Kai only | Agent drafts, Kai sends |
| API key management | Kai | Shares keys directly — never committed to repo |
| Agent file creation/editing | Haris (with Kai review) | Always on feature branch, PR before merge |
| Workflow building in n8n | Haris (via Claude Code) | Uses workflow-builder-agent |
| QA execution | Haris | Reports results to Kai |
| Blueprint changes | Kai | Core system definition |
| Airtable schema changes | Either | Document in Change Log |

---

# Current Status

## Completed ✅
- Blueprint Agent (Layer 1) — creates and improves structured business blueprints
- Blueprint Validator — validates blueprint schema
- Agent Builder (Layer 2) — generates full agent stack from blueprint
- All 14 agent definition files written and validated
- 4 correction/spec files (dependency, decision logic, onboarding readiness, QA evidence)
- 3 coordination docs (handoff-spec, project-status-spec, workflow-sequence)
- Full local dev stack operational (Node 20, n8n 2.10.4, Claude Code 2.1.77, n8n-MCP)
- Airtable base structured — Clients + Prospects + automation_logs tables
- All 6 n8n credentials added (pa-airtable, pa-n8n-api, pa-clickup, pa-smtp, pa-apollo-io, pa-anthropic)
- **[PA] Onboarding Automation** (7RsRJIqBHFpWZoWM) — 24 nodes, tested, dual emails working
- **[PA] Lead Generation** (YO3f5CL9bYbLTBgw) — 18 nodes, updated 2026-04-08 — Hunter.io domain-search replaces Apollo; Tavily Search (live web) runs 3 real-time Google searches per run → GPT-4o-mini extracts ICP company domains from live results; Normalize Leads filters to ICP titles + skips no-name/no-title contacts; source field set to `hunter`
- **[PA] Outreach Agent** (Mib6RUtJ2IOaUZ4s) — updated 2026-04-08 — branded dark blue HTML email template (#1B2A4A) matching Status Update Agent; Build HTML Emails node added; return format fixed for runOnceForEachItem Code nodes
- **[PA] Status Update Agent** (94DpGwRPWGRPqCVU) — 15 nodes, tested, branded emails working
- **[PA] Referral Trigger Agent** (ka6GesSfWVo2FZtU) — 15 nodes, built, E2E tested PASS 2026-03-27, updated 2026-04-01 — now uses pa-smtp directly (email_1 to client, email_2 draft + alert to Kai); Calendly URL live
- **[PA] ClickUp Sync** (uiTwYIUk6nIFwLtX) — 18 nodes, built 2026-03-27, reads Airtable project_status and syncs ClickUp task statuses every 2 hours, inactive
- **[PA] Reporting Agent** (scj61gBYYWpQydMC) — 16 nodes, built (date unknown — confirmed present 2026-03-31), monthly retainer reports via Claude → email → Airtable update, inactive, never run
- **[PA] Typeform Lead Qualification** (kXxN7O77ongTMwKG) — 13 nodes, built 2026-03-31, fires on Typeform submission → extracts answers → dedup → write Airtable Prospects → score via Claude → email Kai if Grade A/B, inactive, Typeform webhook registered
- **[PA] Credential Follow-Up** (uTnQAq5VlmsHYih4) — 11 nodes, built 2026-03-31, daily 10:00 + manual → fetches onboarding.in_progress clients stalled >48h → alerts Kai by email → updates overdue_flagged_at → logs to automation_logs, inactive
- **[PA] Credential Detector** (hbtSbm2pzrHX1QTn) — 10 nodes, built 2026-04-03, every 2h + manual → fetches onboarding.in_progress clients whose n8n_api_key is now populated → auto-sets project_status=build.ready → alerts Kai to start workflow build → logs to automation_logs, inactive
- **[PA] Website Chatbot** (EPMCxdqKOuwc6hzB) — 15 nodes, built 2026-04-03, fully operational 2026-04-10 — webhook POST /website-chatbot → stateless 3-question chatbot → Claude scores lead (HTTP Request node, not Langchain) → hot: writes Airtable Prospect + returns Calendly link; cold: returns nurture message; borderline: asks clarifying question. Live on phoenixautomation.ai with auto-popup (7s teaser, 13s auto-open). End-to-end verified: hot lead record recRypnI7vsMlisJR created in Airtable Prospects.
- **3 new Airtable Prospects fields added** — `biggest_operational_pain` (long text), `lead_score_grade` (text), `lead_source` (text) — 2026-04-10; field names aligned to chatbot n8n node output
- **[PA] Scoping Agent** (E24KwVMam1e8bbjT) — 15 nodes, built 2026-04-03, webhook POST /scope-call + polls call_complete clients → Claude generates scope (automation_1/2/3, tools, tier) → writes all scope fields to Airtable → emails Kai with Approve button, inactive
- **[PA] Scope Approval** (UB6ZdrnYpJlYfxD4) — 7 nodes, built 2026-04-03, GET /approve-scope?client_slug=X → locks scope_locked_at → Claude generates proposal draft → saves to Airtable proposal_draft field → emails Kai → shows success page, inactive
- **[PA] Workflow Builder Agent** (fy8OuUEGyyWhYzWC) — 15 nodes, built 2026-04-03, polls build.ready clients hourly → reads scope from Airtable → Claude generates n8n workflow JSON per automation → deploys to client's n8n via their API key → sets build_review + emails Kai review links, inactive
- **15 new Airtable Clients fields added** — call_notes, scope_summary, automation_count, automation_1/2/3_name, automation_1/2/3_description, scope_locked_at, proposal_draft, workflows_deployed, build_review_url — 2026-04-03
- **5 new project_status values added** — call_complete, scoping, scope_review, building, build_review — 2026-04-03
- **Mock client created** — docs/clients/sarahs-wellness-studio/ (process-map.md + scope-of-work.md) — Typeform program admission use case, ready for workflow-builder-agent test run
- **Chat embed widget** — docs/website-chatbot-embed.html — copy/paste snippet for Framer/Webflow/any website; calls /webhook/website-chatbot
- **[PA] Onboarding Automation Node 49** updated 2026-03-31 — subject changed to "Welcome to Phoenix Automation — action required before we can start"; n8n account setup section inserted before "Your next steps" (step-by-step: sign up at n8n.io, create API key named "Phoenix Automation", reply with instance URL + key)
- **[PA] Onboarding Automation** updated to 51 nodes — 23 task seeding nodes (all 4 lists) + Extract All Task IDs + 3 mark-complete nodes + writes all clickup_task_* IDs to Airtable — 2026-03-27
- **[PA] Status Update Agent** updated to 20 nodes — 5 new ClickUp sync nodes (determine task + PUT complete + POST comment) — 2026-03-27
- **28 new Airtable Clients fields added** — 21 clickup_task_* task ID fields + 7 supporting fields (workflows_built, qa_verdict, overdue_flagged_at, build_started_at, build_completed_at, qa_started_at, qa_completed_at) — 2026-03-27
- **workflow-builder-agent.md updated** — Airtable Status Updates + ClickUp Task Rules sections added — 2026-03-27
- **qa-agent.md updated** — Airtable Status Updates + ClickUp Task Rules sections added — 2026-03-27
- **pa-smtp** updated to kai@phoenixautomation.ai (Google Workspace, App Password) — 2026-03-27
- Haris has full n8n Cloud access (kaiashley.app.n8n.cloud) — confirmed 2026-03-27
- Google Workspace confirmed active — kai@phoenixautomation.ai and howard@phoenixautomation.ai
- Business registered in Florida; EIN pending document numbers
- Partnership Agreement drafted and sent to Howard Littel
- Client n8n model confirmed: Option A — each client owns their own n8n account
- client_timezone + last_status_update_sent_at fields added to Clients table
- PROJECT_OVERVIEW.md added to repo root
- **n8n Cloud** — all 3 PA workflows imported to kaiashley.app.n8n.cloud (Business Foundry project)
- All workflow IDs updated to cloud IDs; broken connections and hardcoded PAT fixed post-import

## In Progress ⏳
- Default GitHub branch needs switching from `claude/setup-blueprint-agent-YnHBF` to `main` (Kai → Settings → Branches)
- Haris needs n8n Cloud access (Kai to invite)
- Outreach Agent HTML email E2E — Instantly has 19 old duplicate leads blocking personalization test; needs manual cleanup in Instantly dashboard then re-test
- Instantly campaign is active (status confirmed) — warmup_status: 0, needs enabling manually in Instantly dashboard

## Not Started ❌
- Stripe webhook integration — payment confirmation currently manual
- Apollo.io paid plan — deferred (Lead Gen now uses Hunter.io + AI Research Agent)

---

# Architecture

## Tech Stack
| Layer | Tool | Version | Purpose |
|-------|------|---------|---------|
| Workflow automation | n8n | 2.37.1 (Cloud — kaiashley.app.n8n.cloud) | All automated pipelines |
| AI agents | Claude Code | 2.1.77 | Agent execution, code generation |
| Anthropic API | claude-sonnet-4-6 | — | Model for all agent AI calls |
| Agent-to-n8n bridge | n8n-MCP | czlonkowski (local build) | Claude Code controls n8n via MCP |
| CRM / data layer | Airtable | — | Lead scoring, client tracking, delivery logs |
| Project management | ClickUp | — | Client project tracking per engagement |
| Email | Gmail SMTP | — | Onboarding emails, status updates |
| Lead sourcing | Apollo.io | — | ICP-matched prospect sourcing |
| Outreach sequencing | Instantly.ai | — | Cold email sequences — not yet set up |
| Version control | GitHub | — | All agent files, specs, SOPs, scopes |
| IDE | VS Code + Claude Code | — | Primary development environment |

## System Design

**Layer 1 — Blueprint Agent:** Converts raw founder input into a structured, validated business blueprint. Already complete — do not rebuild.

**Layer 2 — Agent Builder:** Reads a validated blueprint and generates the full operational stack. Already complete — do not rebuild.

**Delivery Pipeline:**
```
Lead Generation → Lead Qualification → Assessment → Process Mapping
→ Scoping → Proposal → Onboarding → Build → QA → Activation → Live
```

## Branching Strategy
```
main              ← stable, always deployable
phoenix/[task]    ← all new work goes here, PR before merging to main
```

---

# Environment Setup

## Kai's Machine
| Item | Value |
|------|-------|
| OS | macOS (Apple Silicon — arm64) |
| Node version | 20.20.1 (via nvm) |
| n8n version | 2.37.1 (Cloud — kaiashley.app.n8n.cloud) |
| Claude Code version | 2.1.77 (native install) |
| n8n-MCP location | `~/Documents/n8n-mcp/dist/mcp/index.js` |
| Repo location | `~/Documents/business-agent-foundry` |
| n8n URL | `https://kaiashley.app.n8n.cloud` |
| VPN required | Yes — US server (Atlanta/NordVPN) needed from Vietnam for Anthropic API |

## Haris's Machine
| Item | Value |
|------|-------|
| OS | Windows |
| Node version | 20.20.1 |
| Git version | 2.53.0 |
| Claude Code version | 2.1.76 |
| n8n access | ⏳ Pending n8n Cloud setup by Kai |
| Repo location | `D:\Projects\business-agent-foundry` |

## Session Startup Sequence (Kai)
```bash
# 1. Start n8n in one terminal tab (leave running)
n8n start

# 2. Open repo in VS Code
cd ~/Documents/business-agent-foundry
code .

# 3. Start Claude Code (in VS Code terminal)
claude
# → Select option 1 when prompted about MCP server

# 4. IMPORTANT — auth check
# If you see: "Auth conflict: Using ANTHROPIC_API_KEY instead of Console key"
# Run: unset ANTHROPIC_API_KEY
# Then restart: claude

# 5. Smoke test
# Paste in Claude Code:
# Please read PROJECT_OVERVIEW.md and confirm you have full project context.
# Then run: claude mcp list
# n8n-mcp should show (even if "Failed to connect" — that's a display bug, it works)
```

## Common Startup Errors
| Error | Cause | Fix |
|-------|-------|-----|
| `Auth conflict: Using ANTHROPIC_API_KEY` | Env var + Console login both active | `unset ANTHROPIC_API_KEY` then restart claude |
| `Request timed out` | VPN not on (from Vietnam) | Connect VPN to US server first |
| `n8n-mcp: Failed to connect` | Display bug — server actually works | Ignore, test with an actual MCP call |
| `zsh: command not found: claude` | PATH not set | `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc` |
| n8n won't start | Port 5678 in use | `lsof -i :5678` then kill the PID |

---

# API Credentials & Naming Schema

> All credential names use the `pa-` prefix to keep Phoenix Automation separate from other projects (e.g. FlowPilot) in the same n8n instance.

## n8n Credentials

| Credential Name | Type | Header / Auth | Status |
|----------------|------|--------------|--------|
| `pa-airtable` | Airtable Access Token | — | ✅ Active |
| `pa-n8n-api` | HTTP Header Auth | `X-N8N-API-KEY` | ✅ Active |
| `pa-clickup` | ClickUp API | — | ✅ Active |
| `pa-smtp` | SMTP | Gmail, port 465, SSL | ✅ Active |
| `pa-apollo-io` | HTTP Header Auth | `x-api-key` | ✅ Active |
| `pa-anthropic` | HTTP Header Auth | `x-api-key` | ✅ Active |
| `pa-instantly` | HTTP Header Auth | `Authorization: Bearer` | ✅ Active — ID: xoSojCyLffw4nNe7 |
| `pa-tavily` | Hardcoded in Lead Gen Code node | — | ✅ Active — key: `tvly-dev-ytdoA-...` (stored in Tavily Search node jsCode) |

## Email Addresses
| Purpose | Address |
|---------|---------|
| Owner (Kai) | lightofkai777@gmail.com |
| Test / staging emails | ashleyedwards305@gmail.com |
| SMTP sender | kai@phoenixautomation.ai (Google Workspace, App Password) |

## Anthropic API
| Item | Value |
|------|-------|
| Model | `claude-sonnet-4-6` |
| Max tokens | 1000 |
| Auth header | `x-api-key` |
| Version header | `anthropic-version: 2023-06-01` |
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Console | console.anthropic.com |

## Apollo.io API
| Item | Value |
|------|-------|
| Base URL | `https://api.apollo.io/v1` |
| Endpoint | `/mixed_people/search` |
| Auth header | `x-api-key` |
| ICP filters | job_titles: [owner, founder, director, ceo], num_employees: [5–50], industries: [professional services, trades, health, retail] |
| Daily run time | 06:45 (before outreach at 07:00) |

## Airtable API
| Item | Value |
|------|-------|
| Base URL | `https://api.airtable.com/v0` |
| Auth | `Authorization: Bearer YOUR_PAT` |
| Base ID | `appMLHig3CN7WW0iW` |

## Typeform API
| Item | Value |
|------|-------|
| Base URL | `https://api.typeform.com` |
| Auth header | `Authorization: Bearer tfp_A6vV...BDtCbv6` (full token: Typeform account → Settings → Personal tokens) |
| Form name | Phoenix Automation — Free Assessment |
| Form ID | `RSsWJkcf` |
| Form URL | `https://form.typeform.com/to/RSsWJkcf` |
| Responses endpoint | `https://api.typeform.com/forms/RSsWJkcf/responses` |
| Webhook tag | `pa-n8n-intake` |
| Webhook URL | `https://kaiashley.app.n8n.cloud/webhook/typeform-intake` |
| Webhook secret | `pa-typeform-2026` |
| n8n workflow | `[PA] Typeform Lead Qualification` — ID: `kXxN7O77ongTMwKG` |

### Field IDs
| Ref | Field ID | Type |
|-----|----------|------|
| `business_name` | `q9zgFI0gFUNw` | short_text |
| `industry` | `8sox5Q0vDymK` | dropdown |
| `team_size` | `k8ScFgIubR1C` | number |
| `pain_point` | `jrxkugp0UdwT` | long_text |
| `hours_lost` | `N0zSg93uiRme` | number |
| `email` | `G3GmVcDig8e2` | short_text |
| `thankyou` (screen) | `7wh9HcO9y3F8` | thankyou_screen |

> ⚠️ `show_typeform_branding: false` requires a paid Typeform plan — branding is currently visible (free tier). Upgrade to remove.
> ⚠️ Calendly button URL is placeholder (`https://calendly.com/phoenixautomation/assessment`) — Kai must update to real URL via Typeform UI or API PATCH once Calendly is live.

## ClickUp API
| Item | Value |
|------|-------|
| Base URL | `https://api.clickup.com/api/v2` |
| Auth | `Authorization: YOUR_API_KEY` |
| Team ID | `90141018999` |
| Space ID | `90144568071` |
| Space Name | `Phoenix Automation` (color: `#1B2A4A`) |
| ClickUp list template ID | `t-901414909247` (template does NOT auto-seed tasks — verified 2026-03-27) |
| Folder: Client Projects | `90147969224` |
| List: [PA] Client Template | `901414699447` |
| Folder: Internal | `90147969240` |
| List: Internal / Lead Management | `901414699479` |
| List: Internal / Operations | `901414699480` |

### ClickUp Space Hierarchy (2026-03-27)
```
SPACE 90144568071 — Phoenix Automation
├── [FOLDER] Client Projects           90147969224
│   └── [LIST] [PA] Client Template    901414699447  (7 template tasks — manual reference only, not auto-seeded)
│
├── [FOLDER] Internal                  90147969240
│   ├── [LIST] Lead Management         901414699479
│   └── [LIST] Operations              901414699480
│
├── [FOLDER] brightline-property-management   90148144284  ← TEST (test-complete)
│   ├── [LIST] Onboarding   901414908093
│   ├── [LIST] Build        901414908094
│   ├── [LIST] QA           901414908096
│   └── [LIST] Live         901414908097
│
└── [FOLDER] meridian-consulting-group  90148144286  ← TEST (lead)
    ├── [LIST] Onboarding   901414908100
    ├── [LIST] Build        901414908103
    ├── [LIST] QA           901414908104
    └── [LIST] Live         901414908105
```

> ⚠️ **ClickUp API constraint (permanent):** The ClickUp v2 API does not support `POST /folder/{id}/folder`. Client folders CANNOT be nested inside Client Projects via API — they are always created at space root with `POST /space/{space_id}/folder`. The Client Projects folder (90147969224) is a manual organizational container only. Do not attempt to use `/folder/{id}/folder` — it returns 404.

---

# Airtable Schema

## Base ID: `appMLHig3CN7WW0iW`

### ⚠️ CRITICAL: Always use table ID `tblfvqqyYukRJQYmQ`
Using `tblfvqqyYukRJQYmQYgdBXXCYhRqJ` (old/wrong ID) causes 403 Forbidden errors. This has burned time multiple times. Never use the long version.

### Clients Table — `tblfvqqyYukRJQYmQ`

| Field | Type | Set by |
|-------|------|--------|
| company_name | singleLineText | Onboarding webhook |
| email | email | Onboarding webhook |
| contact_name | singleLineText | Onboarding webhook |
| client_slug | singleLineText | Derived: company_name slugified |
| project_status | singleSelect: lead, proposal_sent, onboarding.in_progress, onboarding.stalled, build.ready, build.in_progress, build.blocked, build.complete, qa.in_progress, qa.pass, qa.fail, activation.pending, live, closed.no_deal, closed.post_delivery, test-complete — field ID: `fldnAaIuv4VSGcxuB` | Onboarding automation / manual |
| service_tier | singleSelect: starter-build, growth-build, scale-build, retainer, agency-retainer | Onboarding webhook |
| industry | singleLineText | Manual / lead qual |
| lead_score_grade | singleLineText: A, B, C, D | Lead qual agent |
| scope_of_work | multilineText | Scoping agent |
| tools_required | multilineText | Scoping agent (comma-separated) |
| n8n_workspace_id | singleLineText | Onboarding automation |
| n8n_credentials_template_id | singleLineText | Onboarding automation |
| clickup_folder_id | singleLineText | Onboarding automation — stores ClickUp folder ID (not list ID) — field ID: `fld9PdwZetXwjENmb` |
| clickup_list_onboarding | singleLineText | Onboarding automation — Onboarding list ID — field ID: `fld2J6E0GV9joIL7r` |
| clickup_list_build | singleLineText | Onboarding automation — Build list ID — field ID: `fldRv30powHF8QPAn` |
| clickup_list_qa | singleLineText | Onboarding automation — QA list ID — field ID: `flddH0HJlUMdUXIpj` |
| clickup_list_live | singleLineText | Onboarding automation — Live list ID — field ID: `fldxeGj8sbr56QcyP` |
| clickup_task_ob_welcome | singleLineText | Onboarding — task ID for "Welcome email sent to client" — field ID: `fldT6coEJgh4oCuhV` |
| clickup_task_ob_internal | singleLineText | Onboarding — task ID for "Internal summary email sent to Kai" — field ID: `flduaOwqxioIfLU1u` |
| clickup_task_ob_airtable | singleLineText | Onboarding — task ID for "Airtable record updated" — field ID: `fldg760TgTWfd391E` |
| clickup_task_ob_credentials | singleLineText | Onboarding — task ID for "Credential setup instructions sent to client" — field ID: `fldm25hznxNJ4jRqK` |
| clickup_task_ob_tools_connected | singleLineText | Onboarding — task ID for "Client connects all tools in n8n" — field ID: `fldPc3vudpUypeL3Y` |
| clickup_task_ob_credentials_tested | singleLineText | Onboarding — task ID for "All credentials tested green" — field ID: `fldY9xRR9EwWxy16E` |
| clickup_task_ob_build_ready | singleLineText | Onboarding — task ID for "Onboarding complete — build ready" — field ID: `fldWrX34a5mHLk63o` |
| clickup_task_build_started | singleLineText | Build — task ID for "Build started" — field ID: `fldW9mr5f4ofgrA9F` |
| clickup_task_build_complete | singleLineText | Build — task ID for "Owner review requested" — field ID: `fldejDX9PqtHLI50T` |
| clickup_task_qa_checklist | singleLineText | QA — task ID for "QA checklist run" — field ID: `fld6kOiL3zmx517ON` |
| clickup_task_qa_report | singleLineText | QA — task ID for "QA report written" — field ID: `fldOtEINC1glqFeQn` |
| clickup_task_qa_verdict | singleLineText | QA — task ID for "QA verdict recorded" — field ID: `fldRbi0FryUoPbVcL` |
| clickup_task_qa_fixes | singleLineText | QA — task ID for "Conditional fixes verified" — field ID: `fldLQeIVW1p6W5M6d` |
| clickup_task_qa_activation_review | singleLineText | QA — task ID for "Owner activation checklist reviewed" — field ID: `fldU9RKc8nij8fr0d` |
| clickup_task_live_activated | singleLineText | Live — task ID for "Workflows activated in n8n" — field ID: `fldhopnG1CVw3Yfoq` |
| clickup_task_live_airtable_updated | singleLineText | Live — task ID for "Airtable project_status set to live" — field ID: `fldUhSJQgKyY0py9N` |
| clickup_task_live_launch_date | singleLineText | Live — task ID for "project_launch_date recorded in Airtable" — field ID: `fldGb1JSgHmjUUkkc` |
| clickup_task_live_client_notified | singleLineText | Live — task ID for "Client notified — project is live" — field ID: `fldUEIFE70CGVbuB7` |
| clickup_task_live_status_confirmed | singleLineText | Live — task ID for "Status update agent confirmed running" — field ID: `fldewHlPQKdtFEHg3` |
| clickup_task_live_cleanup | singleLineText | Live — task ID for "Test records cleaned up" — field ID: `fldJZPL5NJ7qAgVyP` |
| clickup_task_live_workflow_ids | singleLineText | Live — task ID for "n8n_workflow_ids added to Airtable" — field ID: `fldO1TXvwNgbOMerM` |
| workflows_built | multilineText | workflow-builder-agent appends each completed workflow name — field ID: `fldbfimBsVQx79x44` |
| qa_verdict | singleLineText | PASS / CONDITIONAL PASS / FAIL — written by qa-agent — field ID: `fldhMCjUSubfx1VPn` |
| overdue_flagged_at | dateTime | Last time Kai was notified of overdue onboarding — ClickUp Sync writes this — field ID: `fldS1rPubm04MixWB` |
| build_started_at | dateTime | workflow-builder-agent writes on build start — field ID: `fld0r0YVh911klmzk` |
| build_completed_at | dateTime | workflow-builder-agent writes on build completion — field ID: `fldDwd8axHTZs1Q8r` |
| qa_started_at | dateTime | qa-agent writes on QA start — field ID: `fldQkSD2yIW75Gcfy` |
| qa_completed_at | dateTime | qa-agent writes on QA completion — field ID: `fldemSzna3pjxq2xh` |
| onboarding_started_at | dateTime | Onboarding automation |
| credentials_checklist | multilineText | Onboarding automation (JSON) |
| client_timezone | singleLineText | e.g. America/New_York |
| last_status_update_sent_at | dateTime | Status update agent |
| proposal_value | currency | Manual (owner sets) — field ID: `fldBKINuYvLuDcmO6` |
| project_launch_date | date | Owner sets on activation day — field ID: `fldx8qb1MERAwjvJW` |
| last_report_sent_at | date | reporting-agent — field ID: `fldIhkhfcW1py0A69` |
| referral_sequence_sent_at | date | referral-trigger-agent — field ID: `fldWq5wBqGqlBBuuY` |
| Notes | multilineText | Already existed as default Airtable field — field ID: `fld3YqOzRo6gufQbW` |
| n8n_workflow_ids | multilineText | reporting-agent reads to fetch execution logs — field ID: `fld0faAZi4TmwpP9J` |
| hours_saved_per_week | number (2dp) | reporting-agent — field ID: `fldiGcSZWVWTxv5xH` |
| hours_saved_per_year | number (2dp) | reporting-agent — field ID: `fldpCRJ523c1WaRh0` |
| last_month_executions | number (integer) | reporting-agent — field ID: `fldM0lDU75YrGSldA` |
| last_month_errors | number (integer) | reporting-agent — field ID: `fldSezJjtgJdbTaFL` |
| total_executions | number (integer) | reporting-agent (cumulative) — field ID: `fldF0VI87ANX2HMlR` |
| referral_source | singleLineText | Owner (manual — which client referred this lead) — field ID: `fld3EJ6umiwft6Sh0` |
| referral_sequence_sent | checkbox | referral-trigger-agent gate — prevents duplicate sequences — field ID: `fld5AJCnq1Qd9BYmy` |
| lead_score_total | number (integer) | lead-qualification-agent — 0–8 Typeform score — field ID: `fld2rpfsXSFipmqi6` |
| pre_call_brief | multilineText | lead-qualification-agent — Claude-written owner brief — field ID: `fldCd8333z772ATsU` |
| n8n_api_key | singleLineText | Owner sets after client replies with key — required by workflow-builder-agent — field ID: `fldxqbU9PIVvurgPl` — added 2026-04-01 |

### Prospects Table — `tbluEsKoQ2p49ktVq`

| Field | Type | Notes |
|-------|------|-------|
| prospect_name | singleLineText | Primary |
| company_name | singleLineText | |
| industry | singleLineText | |
| job_title | singleLineText | |
| team_size | number (integer) | |
| email | email | |
| linkedin_url | url | |
| outreach_status | singleSelect: pending, in_sequence, replied, closed, error | pending = ready for outreach |
| source | singleLineText | apollo / hunter |
| sourced_at | dateTime | ISO 8601 |
| biggest_operational_pain | longText | Written by Website Chatbot — pain_description from step 3 — added 2026-04-10 |
| lead_score_grade | singleLineText | Written by Website Chatbot — Claude scoring output (hot/borderline/cold) — added 2026-04-10 |
| lead_source | singleLineText | Written by Website Chatbot — set to `website_chatbot` — added 2026-04-10 |

### Automation Logs Table — `tblL7tDAh1KTLtwpt`

| Field | Field ID | Type | Written by |
|-------|----------|------|------------|
| workflow | fldlZa5Tls26z0HdB | singleLineText | All workflows |
| run_at | fldvZbjYYNQjpDNVp | dateTime | All workflows |
| prospects_found | fldtNuLWXYrNobNfb | number | Lead Gen |
| prospects_added | fldYS3iKl8BmNT4fG | number | Lead Gen |
| prospects_skipped | fldX6YXtuw2ymbDSn | number | Lead Gen |
| status | fldzMmZjKBd48jc3Y | singleLineText | All workflows |
| event | fldLJJlsN4YaEwM1h | singleLineText | Credential Follow-Up, ClickUp Sync — added 2026-04-01 |
| client | fldAN5uJmukAgaJM4 | singleLineText | Credential Follow-Up, ClickUp Sync — added 2026-04-01 |
| notes | fldszrHm2ZvTPlaMu | multilineText | Credential Follow-Up, ClickUp Sync, Referral — added 2026-04-01 |
| timestamp | fldQq93QdesxwZszk | dateTime | ClickUp Sync — added 2026-04-01 |

### Test Records (delete before first real client)
| Record | Table | ID |
|--------|-------|----|
| Status Test Client | Clients | `rec92eToEuIx06mJr` |
| Meridian Consulting Group | Clients | `rectfzSFPqjRQU4u1` |

---

# n8n Workflow Registry

| Workflow | ID | Nodes | Trigger | Status |
|---------|-----|-------|---------|--------|
| [PA] Onboarding Automation | `7RsRJIqBHFpWZoWM` | 51 | POST /payment-confirmed webhook | 🟢 Active — last run 2026-03-25 (success) |
| [PA] Lead Generation | `YO3f5CL9bYbLTBgw` | 13 | Daily 06:45 + manual | 🟢 Active — running daily (last run 2026-03-31 success) |
| [PA] Status Update Agent | `94DpGwRPWGRPqCVU` | 20 | Monday 09:00 + manual | 🟢 Active — last run 2026-03-30 (success) |
| [PA] Referral Trigger Agent | `ka6GesSfWVo2FZtU` | 15 | Daily 08:00 + manual | 🔴 Inactive — E2E tested PASS 2026-03-27; updated 2026-04-01 to use pa-smtp (email_1 sent directly, email_2 draft forwarded to Kai) — Kai activates |
| [PA] ClickUp Sync | `uiTwYIUk6nIFwLtX` | 18 | Every 2 hours + manual | 🔴 Inactive — built 2026-03-27, never run — Kai activates |
| [PA] Reporting Agent | `scj61gBYYWpQydMC` | 16 | Monthly 1st + manual | 🔴 Inactive — built, never run, not documented until 2026-03-31 audit |
| [PA] Typeform Lead Qualification | `kXxN7O77ongTMwKG` | 13 | Typeform webhook (POST /typeform-intake) | 🔴 Inactive — built 2026-03-31, webhook registered with Typeform — Kai activates |
| [PA] Credential Follow-Up | `uTnQAq5VlmsHYih4` | 11 | Daily 10:00 + manual | 🔴 Inactive — built 2026-03-31, alerts Kai when client stalls on credential submission — Kai activates |
| [PA] Outreach Agent | `Mib6RUtJ2IOaUZ4s` | 12 | Daily 07:00 + manual | 🔴 Inactive — built 2026-04-01; campaign_id set 2026-04-01 (6817d31e-e8e6-4a09-87de-e3be8e7cfc4e) — ready for Kai activation |
| [PA] Error Handler | `JByknkdAgxRmDKp3` | 4 | n8n Error Trigger | 🔴 Inactive — built 2026-04-01; connected to all 11 PA workflows as errorWorkflow — Kai activates |
| [PA] Credential Detector | `hbtSbm2pzrHX1QTn` | 10 | Every 2 hours + manual | 🔴 Inactive — built 2026-04-03; polls for clients who submitted n8n credentials → auto-sets build.ready + alerts Kai — Kai activates |
| [PA] Website Chatbot | `EPMCxdqKOuwc6hzB` | 15 | Webhook POST /website-chatbot | 🟢 Active — live on phoenixautomation.ai since 2026-04-10; 3-question qualifier → Claude HTTP scoring → hot: Airtable write + Calendly; cold: nurture; borderline: clarifying Q. E2E PASS (record recRypnI7vsMlisJR) |
| [PA] Scoping Agent | `E24KwVMam1e8bbjT` | 15 | Webhook POST /scope-call + poll every 2h | 🔴 Inactive — built 2026-04-03; call notes → Claude scope → Airtable scope fields → email Kai for approval — Kai activates |
| [PA] Scope Approval | `UB6ZdrnYpJlYfxD4` | 7 | GET /approve-scope?client_slug=X | 🔴 Inactive — built 2026-04-03; Kai clicks link in email → locks scope → generates proposal draft → emails Kai — Kai activates |
| [PA] Workflow Builder Agent | `fy8OuUEGyyWhYzWC` | 15 | Poll hourly + manual | 🔴 Inactive — built 2026-04-03; reads build.ready clients → Claude generates workflow JSON → deploys to client n8n → emails Kai to review — Kai activates |

## Workflow Node Summaries

### [PA] Onboarding Automation (7RsRJIqBHFpWZoWM) — 51 nodes
```
1.  Payment Confirmed Webhook (POST /payment-confirmed)
2.  Normalize Payload (Code)
3.  Validate Payload (IF)
4.  Derive Client Slug (Code)
5.  Airtable — Lookup Client (HTTP GET)
6.  Merge Airtable Context (Code)
7.  Create n8n Workspace (Code — stubbed)
8.  Extract Workspace ID (Code)
9.  Read Scope of Work (HTTP GET Airtable)
10. Extract Tools Required (Code)
11. Create Credentials Template (Code)
12. Extract Template ID (Code)
13. Create Client ClickUp Folder (HTTP POST /api/v2/space/90144568071/folder — ⚠️ space root only)
14. Extract Folder ID (Code)
15. Create List — Onboarding (HTTP POST)
16. Create List — Build (HTTP POST)
17. Create List — QA (HTTP POST)
18. Create List — Live (HTTP POST)
19–25. Seed 7 Onboarding Tasks: "Welcome email sent to client", "Internal summary email sent to Kai",
       "Airtable record updated", "Credential setup instructions sent to client",
       "Client connects all tools in n8n", "All credentials tested green",
       "Onboarding complete — build ready"
26–29. Seed 4 Build Tasks: "Build started", "Error handling configured",
       "Build log written", "Owner review requested"
30–34. Seed 5 QA Tasks: "QA checklist run", "QA report written", "QA verdict recorded",
       "Conditional fixes verified", "Owner activation checklist reviewed"
35–41. Seed 7 Live Tasks: "Workflows activated in n8n", "Airtable project_status set to live",
       "project_launch_date recorded in Airtable", "Client notified — project is live",
       "Status update agent confirmed running", "Test records cleaned up",
       "n8n_workflow_ids added to Airtable"
42. Extract All Task IDs (Code — maps all 23 task creation responses to clickup_task_* field names)
43. Merge ClickUp Folder ID (Code — adds folder_id + 4 list IDs to priorData)
44. Log ClickUp Error — Continue (Code — error branch, nulls all IDs)
45. Update Airtable Record (HTTP PATCH — writes project_status + all IDs + all 21 clickup_task_* fields)
46. Mark Task: OB Airtable Complete (HTTP PUT → clickup_task_ob_airtable → "complete", pa-clickup)
47. Send Onboarding Summary Email (SMTP → lightofkai777@gmail.com)
48. Mark Task: OB Internal Complete (HTTP PUT → clickup_task_ob_internal → "complete", pa-clickup)
49. Send Client Welcome Email (SMTP → client email)
50. Mark Task: OB Welcome Complete (HTTP PUT → clickup_task_ob_welcome → "complete", pa-clickup)
51. Stop — Invalid Payload (stopAndError)
```

### [PA] Lead Generation (YO3f5CL9bYbLTBgw) — 11 nodes
```
1. Schedule Trigger (daily 06:45)
2. Manual Trigger
3. Fetch ICP Prospects (HTTP → Apollo.io /mixed_people/search, credential: pa-apollo-io)
4. Check Empty Results (IF — exits if 0 results)
5. Split Into Items (Code — normalises Apollo response to array)
6. Loop Over Items (splitInBatches, batch=1)
7. Check Prospect Exists (HTTP GET → Airtable Prospects table, filter by email)
8. Dedup and Prepare (Code — sets write_to_airtable: true/false as string)
9. Route New vs Existing (IF — checks String($json.write_to_airtable) === "true")
10. Write New Prospect (HTTP POST → Airtable Prospects table, credential: pa-airtable)
11. Aggregate Run Stats + Log Run Summary (Code + HTTP POST → automation_logs)
```

### [PA] Status Update Agent (94DpGwRPWGRPqCVU) — 20 nodes
```
1.  Schedule Trigger (Monday 09:00)
2.  Manual Trigger
3.  Fetch Active Clients (HTTP GET → Airtable Clients, filter: {project_status}="live")
4.  Check Active Clients (IF — exits if 0)
5.  Exit - No Active Clients (NoOp)
6.  Split Client Records (Code — flattens records, filters null clickup_folder_id)
7.  Get All Tasks From Folder (HTTP GET → /api/v2/team/90141018999/task?folder_ids[]={clickup_folder_id}&include_closed=true&limit=100)
8.  Error Skip (Code — non-blocking on ClickUp error)
9.  Merge Client and Tasks (Code)
10. Structure Task Data (Code — categorises tasks: completed/in_progress/blocked)
11. Build Claude Payload (Code)
12. Generate Email via Claude (HTTP POST → Anthropic API, pa-anthropic)
13. Extract Email Body (Code — builds branded HTML)
14. Send Status Email (SMTP → client email, pa-smtp)
15. Update Airtable Record (HTTP PATCH → sets last_status_update_sent_at)
16. Determine ClickUp Task Update (Code — maps project_status to cu_update_task_id + cu_comment_task_id)
17. IF Has Task Update (IF)
18. PUT ClickUp Task Complete (HTTP PUT → clickup_task_live_status_confirmed → "complete", pa-clickup, continueOnFail)
19. IF Has Comment (IF)
20. POST ClickUp Comment (HTTP POST → task comment: "Weekly status email sent — [date]", pa-clickup, continueOnFail)
```

### [PA] ClickUp Sync (uiTwYIUk6nIFwLtX) — 18 nodes
```
1.  Schedule Trigger (every 2 hours: 0 */2 * * *)
2.  Manual Trigger
3.  Fetch Active Clients (HTTP GET → Airtable, filter excludes: lead, proposal_sent, closed.*, test-complete, empty)
4.  Check Has Clients (IF)
5.  Exit — No Active Clients (NoOp)
6.  Split Client Records (Code — one item per record, all clickup_task_* fields extracted)
7.  Loop Over Clients (splitInBatches, batch=1)
8.  Determine Sync Actions (Code — switch on project_status → task_updates[], email, airtable_update)
9.  IF Has Task Updates (IF)
10. Split Task Updates (Code — one item per {task_id, new_status})
11. Loop Task Updates (splitInBatches, batch=1)
12. PUT ClickUp Task Status (HTTP PUT → /api/v2/task/{task_id}, pa-clickup, continueOnFail=true)
13. Continue After Task Loop (Code — pass-through)
14. IF Send Notification Email (IF — checks sync_actions.email)
15. Send Notification Email (emailSend → lightofkai777@gmail.com, pa-smtp)
16. IF Update Airtable (IF — checks sync_actions.airtable_update)
17. PATCH Airtable — Overdue Flag (HTTP PATCH → overdue_flagged_at, pa-airtable)
18. Log Sync Summary (Code)

Status cases handled: onboarding.in_progress (overdue check + email), build.ready, build.in_progress, build.blocked (email), build.complete, qa.in_progress, qa.pass (email), qa.fail (email), activation.pending, live
```

### [PA] Reporting Agent (scj61gBYYWpQydMC) — 16 nodes
```
1.  Schedule Trigger (monthly 1st)
2.  Manual Trigger
3.  Fetch Retainer Clients (HTTP GET → Airtable)
4.  Check Has Clients (IF)
5.  Exit — No Retainer Clients (NoOp)
6.  Split Client Records (Code)
7.  Check Workflow IDs (IF — skips clients with no n8n_workflow_ids)
8.  Set Zero Execution Metrics (Code — fallback for clients with no executions)
9.  Fetch Executions (HTTP GET → n8n API, pa-n8n-api)
10. Merge Client and Executions (Code)
11. Aggregate Execution Metrics (Code)
12. Build Claude Payload (Code)
13. Generate Report via Claude (HTTP POST → Anthropic API, pa-anthropic)
14. Extract Report and Build HTML (Code)
15. Send Report Email (emailSend → client email, pa-smtp)
16. Update Airtable Record (HTTP PATCH → last_report_sent_at, pa-airtable)
```

### [PA] Typeform Lead Qualification (kXxN7O77ongTMwKG) — 13 nodes
```
1.  Typeform Intake Webhook (POST /typeform-intake — production URL: https://kaiashley.app.n8n.cloud/webhook/typeform-intake)
2.  Extract Answers (Code — parses Typeform payload by field ref: business_name, industry, team_size, pain_point, hours_lost, email)
3.  Check Duplicate (HTTP GET → Airtable Prospects, filterByFormula by email, continueOnFail)
4.  IF Duplicate (IF — records.length > 0)
    TRUE  → 7 (skip write, use existing record_id)
    FALSE → 5
5.  Write to Airtable (HTTP POST → Prospects table, typecast:true, continueOnFail)
6.  Set New Record Data (Code — extracts record_id from write response, sets is_new:true)
7.  Build Score Payload (Code — fan-in from 4-TRUE and 6; constructs claude_payload with scoring prompt)
8.  Score Lead via Claude (HTTP POST → Anthropic API, pa-anthropic, continueOnFail)
9.  Parse Score (Code — extracts score_total 0-8, score_grade A/B/C/D, pre_call_brief from Claude JSON)
10. Update Airtable Score (HTTP PATCH → Prospects record, writes lead_score_total, continueOnFail)
11. IF Grade A or B (IF — ["A","B"].includes(score_grade))
    TRUE  → 12
    FALSE → 13
12. Email Kai — High Grade Lead (emailSend → lightofkai777@gmail.com, pa-smtp, with pre_call_brief, continueOnFail)
13. Log to Automation Logs (HTTP POST → tblL7tDAh1KTLtwpt, pa-airtable, continueOnFail)

Typeform webhook: tag=pa-n8n-intake, secret=pa-typeform-2026, enabled=true
```

### [PA] Credential Follow-Up (uTnQAq5VlmsHYih4) — 11 nodes
```
1.  Daily 10AM Trigger (scheduleTrigger — daily at 10:00)
2.  Manual Trigger
3.  Fetch Stalled Clients (HTTP GET → Airtable Clients, filter: project_status=onboarding.in_progress AND onboarding_started_at IS_BEFORE(NOW()-2days), pa-airtable, continueOnFail)
4.  IF Stalled Clients Exist (IF — records.length > 0)
    TRUE  → 6 (has stalled clients)
    FALSE → 5 (no stalled clients)
5.  Exit No Stalled Clients (NoOp)
6.  Split Client Records (Code — extracts record_id, company_name, email, contact_name, onboarding_started_at, overdue_flagged_at, hours_overdue)
7.  Loop Over Clients (splitInBatches, batch=1)
8.  IF Already Flagged Today (IF — overdue_flagged_at not empty AND <24h ago)
    TRUE  → skip (already alerted within 24h)
    FALSE → 9 (send alert)
9.  Send Follow-Up Alert to Kai (emailSend → lightofkai777@gmail.com, pa-smtp, continueOnFail — includes company, contact, hours overdue, action prompt)
10. Update overdue_flagged_at (HTTP PATCH → Airtable Clients record, pa-airtable, continueOnFail)
11. Log to Automation Logs (HTTP POST → tblL7tDAh1KTLtwpt, event=credential_followup_alert_sent, pa-airtable, continueOnFail)
    → loops back to Node 7 (Loop Over Clients)
```

### [PA] Outreach Agent (Mib6RUtJ2IOaUZ4s) — 12 nodes
```
1.  Schedule Trigger (daily 07:00)
2.  Manual Trigger
3.  Fetch Pending Prospects (HTTP GET → Airtable Prospects, filter: outreach_status="pending", maxRecords=50, pa-airtable)
4.  IF Has Prospects (IF — records.length > 0)
5.  Exit — No Pending Prospects (NoOp — FALSE branch)
6.  Split Prospect Records (Code — flattens records array, extracts record_id + fields)
7.  Loop Over Prospects (splitInBatches, batch=1)
8.  Generate Email Sequence via Claude (HTTP POST → Anthropic API, pa-anthropic — generates email_1/2/3 as JSON)
9.  Parse Email Sequence (Code — extracts email_1/2/3 from Claude JSON response, merges with prospect data)
10. Add Lead to Instantly (HTTP POST → /api/v1/lead/add, pa-instantly — campaign_id="6817d31e-e8e6-4a09-87de-e3be8e7cfc4e", continueOnFail)
11. Update Airtable Prospect (HTTP PATCH → outreach_status=in_sequence + outreach_started_at + instantly_campaign_id, pa-airtable, continueOnFail)
12. Log Run Summary (HTTP POST → automation_logs, event=outreach_batch_sent, pa-airtable, continueOnFail)
    → loops back to Node 7 (Loop Over Prospects)

campaign_id: 6817d31e-e8e6-4a09-87de-e3be8e7cfc4e (set 2026-04-01)
```

### [PA] Error Handler (JByknkdAgxRmDKp3) — 4 nodes
```
1.  Error Trigger (n8n Error Trigger — fires when any connected workflow fails)
2.  Format Error (Code — extracts workflow_name, workflow_id, node_name, error_message, execution_id, timestamp)
3.  Log to Airtable (HTTP POST → automation_logs, event=workflow_error, pa-airtable, continueOnFail)
4.  Alert Kai (Send Email → lightofkai777@gmail.com, pa-smtp — subject: "🚨 Workflow error — [workflow name]", body includes all error details + n8n execution URL)

Connected as errorWorkflow for: all 11 PA workflows
```

### [PA] Credential Detector (hbtSbm2pzrHX1QTn) — 10 nodes
```
1.  Every 2 Hours (Schedule Trigger — runs every 2 hours)
2.  Manual Trigger
3.  Fetch Clients With Credentials (HTTP GET → Airtable Clients, filter: project_status="onboarding.in_progress" AND n8n_api_key!="", pa-airtable)
4.  IF Credentials Found (IF — records.length > 0)
5.  Exit — No New Credentials (NoOp — FALSE branch)
6.  Split Client Records (Code — extracts record_id, client_name, client_slug, n8n_api_key, n8n_workspace_id)
7.  Loop Over Clients (splitInBatches, batch=1)
8.  Set Status to build.ready (HTTP PATCH → Airtable Clients, project_status="build.ready", pa-airtable, continueOnFail)
9.  Alert Kai — Build Ready (Send Email → lightofkai777@gmail.com — subject: "✅ Build Ready: [client]", includes client slug + n8n workspace URL + next step instructions, continueOnFail)
10. Log to Automation Logs (HTTP POST → automation_logs, event=credentials_received, pa-airtable, continueOnFail)
    → loops back to Node 7
```

### [PA] Website Chatbot (EPMCxdqKOuwc6hzB) — 15 nodes
```
Webhook URL: https://kaiashley.app.n8n.cloud/webhook/website-chatbot
Input: POST { session_id, step (0–3), business_type, team_size, pain_description }
Output: JSON { message, next_step, done, route?, calendly_url? }

1.  Chatbot Webhook (Webhook — POST /website-chatbot, responseMode: responseNode)
2.  Route by Step (Switch — routes on step value 0/1/2/3)
3.  Greeting Response (Set — step=0, returns opening question)
4.  Question 2 Response (Set — step=1, asks team size)
5.  Question 3 Response (Set — step=2, asks biggest pain)
6.  Send Early Step Response (Respond to Webhook — returns message + next_step for steps 0–2)
7.  Score Lead via Claude (HTTP POST → Anthropic API /v1/messages, pa-anthropic HTTP Header Auth
    — prompt includes all 3 answers, returns JSON { route, pain_summary, clarifying_question }
    — uses $json.body?.pain_description || $json.body?.pain_point as fallback, step=3 only
    ⚠️ NOTE: was originally a Langchain AI node — replaced 2026-04-10 because Langchain nodes require
    "Anthropic API" credential type; pa-anthropic is "HTTP Header Auth" — incompatible)
8.  Parse Claude Score (Code — reads $input.first().json.content?.[0]?.text, strips markdown fences,
    parses JSON, extracts route/pain_summary/clarifying_question, merges with prospect context)
9.  IF Hot Lead (IF — route = "hot")
10. Write Hot Prospect to Airtable (HTTP POST → Airtable Prospects tbluEsKoQ2p49ktVq,
    fields: business_type, team_size, biggest_operational_pain, lead_score_grade, lead_source=website_chatbot,
    outreach_status=pending, pa-airtable, continueOnFail)
11. Hot Response Data (Set — returns Calendly URL + personalised message referencing pain_summary)
12. IF Borderline (IF — route = "borderline")
13. Borderline Response Data (Set — returns clarifying_question from Claude)
14. Cold Response Data (Set — returns nurture message with kai@phoenixautomation.ai contact)
15. Send Response (Respond to Webhook — returns final JSON with CORS headers)

Embed widget: docs/website-chatbot-embed.html — copy/paste before </body> tag
Website widget features (live on phoenixautomation.ai):
- Orange bubble (#E8520A) matching brand
- Auto-popup teaser at 7s, auto-open at 13s
- Local greeting (no n8n call for step 0 — avoids timing errors)
- Close button in chat header
- Calendly links made clickable automatically
```

---

# Agent Registry

| Agent File | Purpose | Status |
|-----------|---------|--------|
| `.claude/agents/blueprint-agent.md` | Creates/improves business blueprints | ✅ |
| `.claude/agents/blueprint-validator.md` | Validates blueprint schema | ✅ |
| `.claude/agents/agent-builder.md` | Generates full agent stack from blueprint | ✅ |
| `.claude/agents/lead-generation-agent.md` | Sources ICP prospects from Apollo.io | ✅ |
| `.claude/agents/lead-qualification-agent.md` | Scores inbound leads, routes to Calendly | ✅ |
| `.claude/agents/process-mapping-agent.md` | Maps client processes from assessment call | ✅ |
| `.claude/agents/automation-scoping-agent.md` | Produces scope of work + proposal draft | ✅ |
| `.claude/agents/workflow-builder-agent.md` | Builds n8n workflows from scope files | ✅ |
| `.claude/agents/qa-agent.md` | 25-item QA checklist before activation | ✅ |
| `.claude/agents/onboarding-automation.md` | Client workspace + credential setup | ✅ |
| `.claude/agents/status-update-agent.md` | Weekly client status emails | ✅ |
| `.claude/agents/proposal-drafting-agent.md` | Converts call notes to proposals | ✅ |
| `.claude/agents/outreach-agent.md` | Cold outreach + follow-up sequences | ✅ |
| `.claude/agents/reporting-agent.md` | Monthly performance reports | ✅ |
| `.claude/agents/referral-trigger-agent.md` | 30-day post-launch referral sequence | ✅ |

---

# File Structure

```
business-agent-foundry/
├── PROJECT_OVERVIEW.md          ← this file — read first every session
├── .gitignore                   ← excludes .mcp.json, .DS_Store
├── .claude/
│   ├── agents/                  ← 14 agent definition files
│   ├── hooks/validate-blueprint.sh
│   ├── skills/                  ← 4 skill files (audit, create, improve, extract)
│   └── templates/blueprint-schema.json
└── docs/
    ├── agents/agent-build-index.md + manifests/
    ├── blueprints/
    │   ├── agent-map.md
    │   ├── assumptions-and-gaps.md
    │   ├── build-priority.md
    │   ├── business-blueprint.json
    │   └── business-blueprint.md
    ├── clients/phoenix-automation/
    │   ├── build-log.md
    │   ├── qa-report.md
    │   └── scope-of-work.md
    ├── sops/                    ← 6 SOP files
    ├── specs/
    │   ├── decision-logic-spec.md
    │   ├── onboarding-readiness-spec.md
    │   ├── qa-evidence-spec.md
    │   └── workflow-dependency-spec.md
    ├── setup/
    │   ├── airtable-structure.md  ← canonical Airtable schema (all tables, all fields)
    │   └── clickup-structure.md   ← ClickUp space blueprint (folders, lists, tasks)
    └── workflows/
        ├── build-scopes/        ← 6 workflow build scope files
        ├── handoff-spec.md
        ├── project-status-spec.md
        └── workflow-sequence.md
```

---

# End-to-End Data Flow

```
1. LEAD GENERATION (daily 06:45) ✅ LIVE
   Apollo.io → ICP filter → dedup → write Prospects (outreach_status: pending) → log

2. OUTREACH (daily 07:00) ✅ BUILT (inactive — Kai activates after Instantly campaign created)
   Read pending prospects → Claude generates 3-email sequence → Instantly.ai queue → update Airtable status

3. LEAD QUALIFICATION (inbound) ✅ BUILT (inactive — Kai activates)
   Typeform webhook → score via Claude → grade A/B = email Kai → write to Airtable Prospects

4. ASSESSMENT + PROCESS MAPPING (owner)
   Owner call → process-mapping-agent → docs/clients/[slug]/process-map.md

5. SCOPING + PROPOSAL (owner triggers)
   automation-scoping-agent → pricing tree → scope-of-work.md + proposal-draft.md → owner sends

6. PAYMENT → ONBOARDING ✅ LIVE
   Stripe webhook → [PA] Onboarding Automation
   → validate → slug → Airtable lookup → workspace name → credentials checklist
   → ClickUp project → update Airtable → owner summary email + client welcome email

7. BUILD (owner triggers)
   workflow-builder-agent + n8n-MCP → builds client's automations in n8n

8. QA (Haris runs)
   qa-agent 25-item checklist → PASS = owner activation checklist → FAIL = back to builder

9. ACTIVATION (Kai only — manual in n8n)

10. LIVE
    Status Update Agent → every Monday 09:00 → client email ✅ LIVE
    Reporting Agent → monthly → client report ❌ NOT BUILT
    Referral Trigger → day 30 → pa-smtp email_1 to client + email_2 draft to Kai ✅ BUILT (inactive)
```

---

# Recurring Bugs & Fixes Reference

> These bugs have appeared multiple times. Check here before debugging from scratch.

| Bug | Symptom | Root Cause | Fix |
|-----|---------|-----------|-----|
| Airtable 403 Forbidden | `INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND` | Wrong table ID (long version) | Use `tblfvqqyYukRJQYmQ` not the long version |
| Code node json error | `A 'json' property isn't an object` | Return not wrapped correctly | Always return `[{ json: { ...fields } }]` |
| IF node type error | `Wrong type: '' is a string but was expecting array` | Array operator on string field | Use Code node to set boolean flag, then IF checks string `"true"/"false"` |
| Blank emails | Email body renders empty | Claude HTML unpredictable format | Ask Claude for plain text sections, build HTML in Code node |
| Loop node stale state | Loop stops after first client | splitInBatches retains state | Clear `staticData` to null or replace with direct Code node processing |
| n8n timeout from Vietnam | `Request timed out` in Claude Code | High latency to Anthropic servers | Connect VPN to US server before starting Claude Code |
| Auth conflict timeout | `Auth conflict: Using ANTHROPIC_API_KEY` | Env var + Console login both active | `unset ANTHROPIC_API_KEY` then restart claude |
| Node reference error | `Referenced node doesn't exist` | Node was renamed/removed | Change all `$('Old Node Name')` references to `$json` |
| ClickUp Folder error | `Error fetching options from ClickUp` | Space has no folders | Toggle `Folderless List` ON in ClickUp node |
| n8n MCP "Failed to connect" | Health check shows failed | Display bug only | Ignore — test with actual MCP call to confirm it works |
| n8n repeated fields[] params not sent | Airtable returns only last field; all others empty | n8n HTTP Request node doesn't reliably send repeated query params with same key | Remove all fields[] restrictions — let Airtable return all fields; Code nodes read only what they need |
| record_id undefined after HTTP node | PATCH URL resolves to `/undefined`; flag node fails silently | HTTP Request node output = API response body, not input data — record_id is lost | Use `$('NodeName').item.json.record_id` to reach back to last Code node that had the field |
| ClickUp /folder/{id}/task 404 | `Route not found` from ClickUp API | `/folder/{id}/task` endpoint does not exist in ClickUp v2 | Use `/team/{team_id}/task?folder_ids[]={folder_id}` — PA team ID: `90141018999` |
| Airtable checkbox formula invalid | `INVALID_FILTER_BY_FORMULA` | `{field}=FALSE()` is not valid Airtable formula syntax | Use `NOT({field})` for unchecked checkbox filter |
| ClickUp nested folder creation fails | `Cannot POST /api/v2/folder/{id}/folder` | ClickUp v2 API does not support sub-folder creation — folders can only be created at space root | Always use `POST /api/v2/space/{space_id}/folder` — the Client Projects folder (90147969224) is a manual UI container only, not a parent via API |
| Langchain AI node fails with HTTP Header Auth credential | `Credentials of type anthropicApi are not supported` | n8n Langchain AI nodes require "Anthropic API" credential type. `pa-anthropic` is "HTTP Header Auth" — works for HTTP Request nodes but NOT Langchain nodes | Replace Langchain AI nodes with HTTP Request nodes pointing to `https://api.anthropic.com/v1/messages` with `pa-anthropic` credential. Parse response via `$input.first().json.content?.[0]?.text` |
| Remote Claude Code session blocks n8n API calls | n8n API calls time out or fail silently | Claude Code web/remote sessions run behind an egress proxy that only allows specific domains. `kaiashley.app.n8n.cloud` is not in the allowlist | All n8n workflow changes must be made via Python scripts run locally in Kai's VS Code terminal |

---

# Decisions & Reasoning

| Decision | Rationale |
|---------|-----------|
| n8n self-hosted (local) | Free tier, full control, no enterprise features needed |
| n8n-MCP via local clone | npx download times out (500MB) from SE Asia — must clone and build locally |
| Hardcoded values, not n8n Variables | Variables is enterprise-only on community edition |
| n8n Projects stubbed (nodes 7+11) | `/api/v1/projects` returns 403 on community edition — replaced with Code nodes |
| pa- prefix for all credentials | Separates Phoenix Automation from FlowPilot in same n8n instance |
| Two email nodes in onboarding | Internal owner summary + client welcome serve different purposes |
| company_name \|\| client_name for slug | Stripe sends billing contact in client_name — company_name is more reliable for slug |
| Unset ANTHROPIC_API_KEY for Claude Code | Env var + Console login simultaneously causes request timeouts |
| VPN (US server) required | Anthropic API latency from Vietnam exceeds Claude Code timeout threshold |
| Plain text → JS HTML for emails | Claude HTML output is unpredictable; Code node builds guaranteed structure |
| Folderless List for ClickUp node | Phoenix Automation space has no folders — lists are at space level directly |
| String comparison for IF dedup | n8n v2 IF node array operators are unreliable — string "true"/"false" is bulletproof |
| n8n Cloud for team access | n8n Projects requires enterprise on self-hosted; Cloud Starter (~$20/mo) supports 2 users |
| filterByFormula uses double quotes | Airtable rejects single quotes in formula strings — always use `{field}="value"` |

---

# Known Issues

| Issue | Severity | Status | Owner |
|-------|---------|--------|-------|
| Test records in Airtable/ClickUp need cleanup | Low | ✅ RESOLVED 2026-03-27 — 3 blank junk rows deleted; Status Test Client slug fixed; both test client ClickUp folders recreated with seeded tasks | Haris |
| Error handling workflow not connected | Medium | Deferred | Haris |
| Instantly.ai not set up | Blocks outreach | ⏳ Needs account | Kai |
| Default GitHub branch is wrong | Low | ⏳ Change to main in Settings | Kai |
| Airtable Clients table missing 5 fields | Low | ✅ RESOLVED 2026-03-20 | Haris |
| Airtable — 10 proposed fields for reporting/referral agents | Low | ✅ RESOLVED 2026-03-22 — all 10 added | Haris |
| ClickUp space structure not set up | Medium | ✅ RESOLVED 2026-03-20 (folders/lists created) | Haris |
| ClickUp space unnamed / no branding | Low | ✅ RESOLVED 2026-03-27 — renamed to "Phoenix Automation", color #1B2A4A | Haris |
| Onboarding automation creates folderless lists | Medium | ✅ RESOLVED 2026-03-22 — now creates folder + 4 lists | Haris |
| Onboarding automation doesn't seed tasks into lists | Medium | ✅ RESOLVED 2026-03-27 — 7 task seeding nodes added (nodes 19–25); tasks auto-created in all 4 lists on onboarding | Haris |
| Onboarding automation doesn't store list IDs in Airtable | Medium | ✅ RESOLVED 2026-03-27 — 4 new Airtable fields added (clickup_list_onboarding/build/qa/live); Merge ClickUp Folder ID + Update Airtable Record updated | Haris |
| Client folders created at space root instead of under Client Projects | Low | ✅ DOCUMENTED 2026-03-27 — ClickUp v2 API does not support nested folder creation. Folders must be at space root. Client Projects folder is a manual UI container only. See Recurring Bugs. | Haris |
| clickup_project_id stores list ID instead of folder ID | Medium | ✅ RESOLVED 2026-03-22 — renamed to clickup_folder_id, stores folder ID | Haris |
| Status Update Agent reads single list only | Medium | ✅ RESOLVED 2026-03-22 — now reads all tasks from folder | Haris |
| n8n access for Haris | Blocker for collaboration | ⏳ Cloud up — Kai to invite Haris | Kai |
| Calendly URL hardcoded in Referral Trigger Agent | Low | ✅ RESOLVED 2026-04-01 — updated to https://calendly.com/kai-phoenixautomation/free-business-assessment | Haris |
| `automations_delivered` field missing from Airtable | Low | ⏳ Referral Trigger uses `scope_of_work` as fallback — add dedicated field for cleaner output | Kai decision |
| `onboarding_started_at` not written by Onboarding Automation | Low | ✅ RESOLVED 2026-03-26 — added to Node 21 (Update Airtable Record) jsonBody | Haris |
| Brightline test records still live in Airtable (Clients + Prospects) | Low | ⏳ Clean up after Step 6 confirmed — see e2e-test-report.md | Kai/Haris |
| project_status singleSelect missing 11 new values | Medium — ClickUp Sync won't email/sync for new statuses until added | ✅ RESOLVED 2026-03-27 — all 11 values added via Airtable Records API typecast:true | Haris |
| Brightline + Meridian clickup_task_* fields are empty | Low — test records; won't affect real clients | ⏳ Expected: Onboarding was run before task ID fields existed. Real clients onboarded now will have all fields populated automatically. | — |
| Status Update Agent + Referral Trigger Agent not API-executable | Low | Known — schedule-only workflows must be run from n8n editor | — |
| Meridian Consulting `project_status=live` pollutes Status Update Agent emails | High | ✅ RESOLVED 2026-03-26 — Status Test Client set to test-complete; Meridian folder created (90148117751) with 4 lists; Airtable folder ID corrected | Haris |
| ClickUp API key expired | Medium — ClickUp Sync will fail all executions | ✅ RESOLVED 2026-04-01 — new key pk_198267967_... applied to credential hLrtpicYXOOXrUh0 | Haris |
| Typeform webhook disabled | High — inbound leads cannot be scored | ✅ RESOLVED 2026-04-01 — re-enabled via Typeform API; enabled: true confirmed | Haris |
| Typeform thank-you screen placeholder Calendly URL | Medium — leads can't book after form | ✅ RESOLVED 2026-04-01 — updated to https://calendly.com/kai-phoenixautomation/free-business-assessment | Haris |
| Instantly campaign_id not configured | Medium — Outreach Agent cannot add leads without it | ✅ RESOLVED 2026-04-01 — campaign_id set to 6817d31e-e8e6-4a09-87de-e3be8e7cfc4e in node "Add Lead to Instantly" | Haris |
| automation_logs missing 4 fields | Medium — newer workflows log to fields that didn't exist (silent fail) | ✅ RESOLVED 2026-04-01 — added event, client, notes, timestamp fields via Airtable API | Haris |
| Test Company client (recv2Tj14xMqP0alp) at proposal_sent | Low — pollutes Credential Follow-Up filter | ✅ RESOLVED 2026-04-01 — set to closed.no_deal | Haris |
| Alice/Bob/Carol prospects at outreach_status=pending | Low — fake .invalid addresses would be queued by Outreach Agent | ✅ RESOLVED 2026-04-01 — set to test-complete | Haris |
| n8n_api_key field missing from Clients table | Medium — workflow-builder-agent needs it to connect to client n8n | ✅ RESOLVED 2026-04-01 — added field (ID: fldxqbU9PIVvurgPl) | Haris |
| Instantly.ai has 0 sending accounts | Blocks Outreach Agent entirely | ⏳ Add sending email account in Instantly UI: Settings → Email Accounts → Connect | Kai |
| Apollo.io free plan blocks lead search | Lead Gen is mock-only | ✅ RESOLVED 2026-04-08 — switched to Hunter.io domain-search + AI Research Agent; Apollo no longer used | Haris |
| Lead Gen writes incomplete prospect records (missing name/company/title) | Rows in Airtable with only email + team_size:0 | Split Into Items node used Apollo field structure (p.first_name, p.organization.name) but Normalize Leads outputs flat format (prospect_name, company_name) | ✅ RESOLVED 2026-04-08 — Split Into Items rewritten to pass through pre-normalized fields directly | Haris |
| Lead Gen source field shows "apollo" after Hunter switch | source: apollo written by Write New Prospect despite Hunter data | Hardcoded string in jsonBody | ✅ RESOLVED 2026-04-08 — changed to source: hunter | Haris |
| Hunter returns contacts with no name AND no job title | bro.man@domain.com style addresses slip through — unusable for personalized outreach | Normalize Leads kept no-title contacts by default | ✅ RESOLVED 2026-04-08 — skip leads where both prospect_name and job_title are empty | Haris |
| Lovable website repo (kaicodesai/phoenixautomation) is private — no direct Claude/agent access | Medium — website changes require manual edits or GitHub token | ⏳ Options: (1) Add GitHub PAT scoped to phoenixautomation repo to session credentials, (2) Enable Lovable → GitHub sync and share PAT, (3) Make repo public temporarily for changes | Kai |
| GitHub MCP tools scoped to business-agent-foundry only | Low — blocks direct pushes to phoenixautomation website repo | ⏳ Update MCP repo scope to include kaicodesai/phoenixautomation when access is needed | Kai/Haris |
| Instantly 19 duplicate leads blocking HTML email test | personalization shows 0 chars despite successful exec | Instantly silently deduplicates on email; old test leads from same campaign cannot be deleted via API (returns count:0) | ⏳ Manual fix: delete duplicate leads in Instantly dashboard then re-run Outreach Agent | Kai |
| Website chatbot not built | High — blueprint requires 24/7 AI qualifier before Typeform | ✅ RESOLVED 2026-04-03 — [PA] Website Chatbot built (EPMCxdqKOuwc6hzB, 15 nodes); embed widget at docs/website-chatbot-embed.html — Kai pastes snippet into website and activates workflow | Haris |
| Website chatbot bot messages showing as empty grey circles | High — users saw no responses after each question | All n8n Set nodes (Greeting, Q2, Q3, Hot/Borderline/Cold Response Data) were completely empty — no fields configured. "Send Early Step Response" referenced `$json.message` which was undefined, returning `[{}]` | ✅ RESOLVED 2026-04-10 — all nodes configured with proper fields; Response Body set to `{{ JSON.stringify($json) }}` | Kai |
| Website chatbot step 3 returning "Something went wrong" | High — leads couldn't complete qualification | "Score Lead via Claude" was a Langchain AI node requiring "Anthropic API" credential type; pa-anthropic is HTTP Header Auth — incompatible | ✅ RESOLVED 2026-04-10 — replaced with HTTP Request node calling Anthropic API directly; Parse Claude Score updated to read HTTP response format | Kai |
| Chatbot hot leads not written to Airtable | High — leads booked calls but no Airtable record created | Write Hot Prospect to Airtable node had field names mismatched after Langchain replacement; Airtable Prospects table missing pain/score/source fields | ✅ RESOLVED 2026-04-10 — 3 new fields added (biggest_operational_pain, lead_score_grade, lead_source); n8n node field names aligned; E2E verified (record recRypnI7vsMlisJR) | Kai |
| Credential auto-handoff gap — no detector when credentials arrive | High — Kai must manually set project_status=build.ready | ✅ RESOLVED 2026-04-03 — [PA] Credential Detector built (hbtSbm2pzrHX1QTn, 10 nodes); polls every 2h, auto-sets build.ready + emails Kai — Kai activates | Haris |
| No mock client for end-to-end testing new use cases | Medium — no reference example for workflow-builder-agent | ✅ RESOLVED 2026-04-03 — docs/clients/sarahs-wellness-studio/ created (process-map.md + scope-of-work.md); Typeform program admission use case fully scoped | Haris |
| Welcome email says "I'll send exact instructions shortly" — credential follow-up is NOT automated | High | ✅ RESOLVED 2026-03-26 — tool-specific step-by-step instructions now inline in welcome email; subject updated | Haris |
| Status Update Agent could mix tasks from clients with wrong/null clickup_folder_id | High | ✅ RESOLVED 2026-03-26 — Split Client Records filters out clients with no folder ID; Get All Tasks endpoint changed to folder-specific URL | Haris |
| Client n8n account model not decided | High — blocks Workflow Builder Agent | ✅ RESOLVED 2026-03-26 — Client creates and owns their own n8n account. Client shares n8n API key + instance URL as part of credential collection (alongside other tools). Welcome email needs n8n setup instructions added. Workflow Builder prereq: n8n API key in Airtable before build starts. | Kai |

---

# TODO / Roadmap

## Immediate (before first real client)
- [x] ✅ E2E systems test Steps 1–5 complete. Step 6 (Referral Trigger) ready for manual execution
- [x] ✅ Status Test Client set to `test-complete` — pollution fix (2026-03-26)
- [x] ✅ Meridian Consulting ClickUp folder created (90148117751) + 4 lists + Airtable record corrected (2026-03-26)
- [x] ✅ Status Update Agent fixed — client filter + folder-specific task URL (2026-03-26)
- [x] ✅ Welcome email updated — tool-specific credential instructions now inline (2026-03-26)
- [x] ✅ `onboarding_started_at` added to Onboarding Automation Airtable update (2026-03-26)
- [ ] **KAI:** Run [PA] Referral Trigger Agent from n8n editor → verify `referral_sequence_sent=true` + automation_logs entry (Brightline test data still ready)
- [ ] **KAI:** Re-run [PA] Status Update Agent to verify clean email after pollution fixes
- [x] ✅ **Haris:** Renamed ClickUp space to "Phoenix Automation" (color #1B2A4A) — 2026-03-27
- [x] ✅ **Haris:** Recreated client ClickUp folders with seeded tasks — Brightline (90148144284) + Meridian (90148144286) — 2026-03-27
- [x] ✅ **Haris:** Added 4 Airtable list ID fields (clickup_list_onboarding/build/qa/live) — 2026-03-27
- [x] ✅ **Haris:** Updated Onboarding Automation (31 nodes) — task seeding + list IDs written to Airtable — 2026-03-27
- [x] ✅ **Haris:** Deleted 3 blank junk Airtable rows; fixed Status Test Client slug — 2026-03-27
- [ ] **KAI/Haris:** Clean up Brightline test records after Step 6 confirmed (see e2e-test-report.md)
- [x] ✅ **KAI DECISION:** Client n8n model decided — **Option A: each client has their own n8n account** (2026-03-26)
- [x] ✅ **Haris:** Update Calendly URL in Referral Trigger Agent (node: Build Claude Payload, workflow: `ka6GesSfWVo2FZtU`) — 2026-04-01
- [ ] **KAI:** Invite Haris to n8n Cloud
- [x] ✅ Add 5 missing fields to Airtable Clients table (2026-03-20)
- [x] ✅ Set up ClickUp space structure (2026-03-20)
- [x] ✅ Add 10 proposed Airtable Clients fields (2026-03-22)
- [x] ✅ Update onboarding automation to folder+4-lists ClickUp structure (2026-03-22)
- [x] ✅ Rename clickup_project_id → clickup_folder_id in Airtable + all workflows (2026-03-22)
- [x] ✅ Update Status Update Agent to read tasks from all folder lists (2026-03-22)
- [x] ✅ End-to-end test Onboarding Automation — PASS 2026-03-22 (execution 209)
- [x] ✅ Kai sets up n8n Cloud — kaiashley.app.n8n.cloud (2026-03-24)
- [ ] Change default GitHub branch to main (Kai)
- [x] ✅ **Haris:** Build [PA] ClickUp Sync (18 nodes, ID: uiTwYIUk6nIFwLtX) — 2026-03-27
- [x] ✅ **Haris:** Update Onboarding Automation — 51 nodes, all 23 tasks seeded with correct names, clickup_task_* IDs stored in Airtable — 2026-03-27
- [x] ✅ **Haris:** Update Status Update Agent — 20 nodes, ClickUp task update + comment on send — 2026-03-27
- [x] ✅ **Haris:** Add 28 new Airtable fields (21 clickup_task_* + 7 supporting) — 2026-03-27
- [x] ✅ **Haris:** Update workflow-builder-agent.md + qa-agent.md with Airtable status updates + ClickUp task rules — 2026-03-27
- [x] ✅ **Haris:** Add 11 new project_status values via Airtable Records API typecast:true — 2026-03-31
- [x] ✅ **Haris:** Regenerate ClickUp API key in n8n credential (hLrtpicYXOOXrUh0) — 2026-04-01
- [x] ✅ **Haris:** Re-enable Typeform webhook pa-n8n-intake — 2026-04-01
- [x] ✅ **Haris:** Update Typeform thank-you Calendly URL — 2026-04-01
- [x] ✅ **Haris:** Create pa-instantly credential in n8n (ID: xoSojCyLffw4nNe7) — 2026-04-01
- [x] ✅ **Haris:** Build [PA] Outreach Agent (ID: Mib6RUtJ2IOaUZ4s, 12 nodes) — 2026-04-01
- [x] ✅ **Haris:** Build [PA] Error Handler (ID: JByknkdAgxRmDKp3, 4 nodes) + connected to all 9 PA workflows — 2026-04-01
- [ ] **KAI:** Create campaign in Instantly UI → copy campaign ID → update "Add Lead to Instantly" node in [PA] Outreach Agent
- [ ] **KAI:** Activate [PA] Error Handler (ID: JByknkdAgxRmDKp3) — no dependencies, safe to activate immediately
- [ ] **KAI:** Activate [PA] Typeform Lead Qualification (ID: kXxN7O77ongTMwKG)
- [ ] **KAI:** Activate [PA] Credential Follow-Up (ID: uTnQAq5VlmsHYih4) — daily stall alert, no dependencies
- [ ] **KAI:** Activate [PA] Referral Trigger Agent (ID: ka6GesSfWVo2FZtU) — now uses pa-smtp directly (no Instantly dependency)
- [ ] **KAI:** Activate [PA] ClickUp Sync (ID: uiTwYIUk6nIFwLtX) — ClickUp key already updated
- [ ] **KAI:** Activate [PA] Outreach Agent (ID: Mib6RUtJ2IOaUZ4s) — after Instantly campaign created + email warmup complete
- [ ] **KAI:** Activate [PA] Reporting Agent (ID: scj61gBYYWpQydMC) — after first retainer client is live

## Short-term
- [x] ✅ **Haris:** Build [PA] Credential Follow-Up (11 nodes, ID: uTnQAq5VlmsHYih4) — daily stall checker, Kai alert email, overdue_flagged_at update, Airtable log — 2026-03-31
- [x] ✅ **Haris:** Add n8n setup instructions to welcome email — Node 49 of 7RsRJIqBHFpWZoWM; subject updated to "action required before we can start"; n8n signup + API key section inserted before "Your next steps" — 2026-03-31
- [ ] Update Workflow Builder Agent scope — prerequisite: client n8n API key + instance URL present in Airtable `n8n_workspace_id` before agent runs (Haris)
- [x] ✅ Calendly URL updated in Referral Trigger Agent (2026-04-01)
- [x] ✅ Referral Trigger Agent updated to use pa-smtp directly — Instantly.ai not required for referrals (2026-04-01)
- [ ] Set up Instantly.ai + pa-instantly credential (Kai — needed for Outreach Agent only, not referrals)
- [ ] Build [PA] Outreach Agent (Haris — after Instantly.ai)
- [ ] Build error handling workflow (Haris)
- [ ] Full pipeline test with real payment webhook (Kai)

## Medium-term
- [ ] Build remaining workflows (Lead Qual, Proposal Drafting)
- [x] ✅ Build [PA] Referral Trigger Agent (2026-03-24)
- [x] ✅ Onboarding Automation, Status Update Agent, Lead Generation active on schedule (confirmed 2026-03-31)
- [ ] Activate remaining 3 inactive workflows: ClickUp Sync, Referral Trigger, Reporting Agent (Kai)
- [ ] First real client onboarded end-to-end

## Long-term
- [ ] Apollo.io paid plan for higher volume
- [ ] Generalize Agent Foundry for second business type

> **Client n8n model — DECIDED (2026-03-26):** Each client creates and owns their own n8n account. During credential collection (onboarding), the client shares their n8n API key and instance URL alongside their other tool credentials. The **Workflow Builder Agent** (automated — runs via n8n-MCP) then uses that API key to connect to the client's n8n instance and build their custom automations there automatically. This is Step 7 of the delivery pipeline. The `n8n_workspace_id` field in Airtable stores the client's n8n instance URL. The welcome email must include n8n account setup as a required credential step. "Client n8n API key in Airtable" is a hard prerequisite before the Workflow Builder Agent can run.

---

# Session Handoff Template

> Fill this in at the end of every session before committing.

```
## Session Handoff — [DATE]
**Worked by:** [Kai / Haris]
**Duration:** [approx]

### What was completed
- 

### What is in progress (not finished)
- 

### Blockers for next session
- 

### Next person should start with
1. 

### Files changed this session
- 
```

---

## Session Handoff — 2026-03-25 (Session 8 — continued)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
- **End-to-end systems test** — Steps 1–4 executed and verified:
  - Step 1: Prospect record `recd7jqEXed0v3oBe` created (Prospects table, `outreach_status=pending`)
  - Step 2: Client record `recNr32G2QJd5bbkw` created (Brightline Property Management / Sarah Chen)
  - Step 3: Onboarding Automation webhook triggered → execution 70 → **PASS** (all 6 Airtable fields written, ClickUp folder `90148085794` created)
  - Step 4: ClickUp folder ID confirmed in Airtable; list count unverifiable (ClickUp key expired mid-session)
- **Bug fix:** Corrected `service_tier` options in PROJECT_OVERVIEW.md — `growth-package` → `growth-build` (plus added full option list)
- **QA report written:** `docs/clients/brightline-property-management/e2e-test-report.md`
- **PROJECT_OVERVIEW.md updated:** version bump, Known Issues, TODO, session handoff

### What is in progress (not finished)
- Steps 5 and 6 of E2E test (Status Update Agent + Referral Trigger Agent) — test data is ready, waiting on manual execution from n8n editor

### Blockers for next session
- Haris not yet invited to n8n Cloud (Kai action required)
- Status Update Agent and Referral Trigger Agent cannot be triggered via API — must be run from n8n editor
- Instantly.ai not configured — Referral Trigger Agent will log stub, not send emails

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **Kai:** Open n8n editor → run [PA] Status Update Agent manually → verify email sent to `muneebfiaz201@gmail.com`
3. **Kai:** Open n8n editor → run [PA] Referral Trigger Agent manually → verify `referral_sequence_sent=true` in Airtable + entry in `automation_logs`
4. **Kai/Haris:** Clean up Brightline test records (instructions in `docs/clients/brightline-property-management/e2e-test-report.md`)
5. **Haris (after n8n access):** Fix `onboarding_started_at` — add field to Node 21 of Onboarding Automation

### Files changed this session
- `PROJECT_OVERVIEW.md` — version 2.4, service_tier options corrected, Known Issues + TODO updated, Session 8 handoff
- `docs/clients/brightline-property-management/e2e-test-report.md` — created (new)

---

## Session Handoff — 2026-04-10 (Session 11)
**Worked by:** Kai + Claude (Claude Code web)

### What was completed
- **Website conversion optimisation** — 9 changes applied via Lovable prompt (higher price language replacing $1,500 mention, urgency mechanism, retainer-implied ongoing support, single highest-converting CTA)
- **Chatbot widget embedded on phoenixautomation.ai** — complete widget in index.html before `</body>` tag; orange bubble (#E8520A), 7s teaser + 13s auto-open popup, local greeting, close button
- **Chatbot empty messages fixed** — all n8n Set nodes (Greeting, Q2 Response, Q3 Response, Hot/Borderline/Cold Response Data) configured with proper fields; Response Body set to `{{ JSON.stringify($json) }}`
- **Chatbot step 3 error fixed** — "Score Lead via Claude" Langchain AI node replaced with HTTP Request node (Langchain requires "Anthropic API" credential type; pa-anthropic is HTTP Header Auth — incompatible). Parse Claude Score node updated to read `$input.first().json.content?.[0]?.text` with markdown fence stripping
- **Airtable Prospects table updated** — 3 new fields added: `biggest_operational_pain`, `lead_score_grade`, `lead_source`; chatbot n8n node field names aligned to match
- **End-to-end chatbot pipeline verified** — hot lead flow created record `recRypnI7vsMlisJR` in Airtable Prospects. Full flow: phoenixautomation.ai widget → 3 questions → Claude scoring → Airtable write → Calendly booking link returned
- **Branch merged to main** — all chatbot + website changes merged from `claude/project-status-client-readiness-c2Vy2` to `main` (commit `5268dd8`)
- **PROJECT_OVERVIEW.md updated** — v4.7, chatbot fully documented, 3 new Known Issues resolved, Recurring Bugs updated, Prospects schema updated

### What is in progress (not finished)
- Nothing — all tasks from this session are complete

### Blockers for next session
- Instantly.ai: warmup_status=0, needs enabling manually in Instantly dashboard (Settings → Email Accounts → toggle warmup ON)
- Instantly 19 duplicate leads need manual cleanup before Outreach Agent E2E can be re-tested
- Lovable/phoenixautomation repo is private — future website changes require Kai to add GitHub PAT or use Lovable UI directly
- Remote Claude Code sessions cannot call n8n API directly (egress proxy blocks kaiashley.app.n8n.cloud) — all future n8n changes must use local Python scripts

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **KAI:** Enable Instantly email warmup in Instantly dashboard (Settings → Email Accounts → warmup toggle)
3. **KAI:** Delete 19 duplicate leads in Instantly dashboard, then re-run [PA] Outreach Agent to test HTML email personalisation
4. **KAI:** Activate [PA] Outreach Agent (ID: Mib6RUtJ2IOaUZ4s) after Instantly cleanup + warmup enabled
5. **KAI:** Activate pending workflows: Error Handler, Typeform Lead Qualification, Credential Follow-Up, Referral Trigger Agent, ClickUp Sync

### Files changed this session
- `PROJECT_OVERVIEW.md` — v4.7, chatbot fully operational, Prospects schema updated, Recurring Bugs + Known Issues updated
- **n8n workflows updated (via local Python scripts — no repo file changes):**
  - `[PA] Website Chatbot` (EPMCxdqKOuwc6hzB) — all Set nodes configured, Langchain→HTTP Request replacement, Parse Claude Score rewritten, Airtable node field names aligned
- **phoenixautomation.ai (kaicodesai/phoenixautomation — private repo):**
  - `index.html` — 9 conversion optimisations + full chatbot widget embedded (edited manually by Kai in Lovable)

---

## Session Handoff — 2026-03-27 (Session 10)
**Worked by:** Kai

### What was completed
- **[PA] Referral Trigger Agent E2E test — PASS** (all 6 steps complete)
  - Brightline record picked up by filter, Claude emails generated, Airtable flags written correctly
- **Referral Trigger Agent bugs fixed (5 bugs this session):**
  1. `{referral_sequence_sent}=FALSE()` → `NOT({referral_sequence_sent})` (invalid Airtable formula)
  2. `fields[]` query params removed from Fetch node — n8n doesn't reliably send repeated same-key params
  3. `record_id` lost after HTTP nodes — fixed with `$('Extract Referral Emails').item.json.record_id`
  4. `Split Client Records` had `|| ,` (missing fallback string) — fixed to `|| ''`
  5. `referral_sequence_sent_at` sent as ISO timestamp to date field — fixed with `.split('T')[0]`
- **Status Update Agent bugs fixed (3 bugs this session):**
  1. `Split Client Records` missing node name: `$().first()` → `$('Fetch Active Clients').first()`
  2. `Get All Tasks From Folder` URL: `/folder/{id}/task` (doesn't exist) → `/team/90141018999/task?folder_ids[]={id}`
  3. `Error Skip` rewritten to pass through client data + `tasks: []` so workflow continues on ClickUp error
- **pa-smtp** updated to kai@phoenixautomation.ai (Google Workspace, App Password)
- **Business updates:** Florida registration confirmed, EIN pending, Partnership Agreement sent to Howard
- **Client n8n model confirmed:** Option A — clients own their own n8n accounts
- Airtable test records cleaned up (Brightline + Prospects both set to test-complete)

### What is in progress (not finished)
- Reporting Agent: Fetch Executions node still has pa-anthropic credential (needs manual switch in editor)
- EIN application pending (document numbers required)
- Partnership Agreement awaiting Howard's signature

### Blockers for next session
- Outreach Agent blocked on Instantly.ai — needs PA domain first
- Onboarding flow needs updating for Option A client n8n model before first real client

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **Kai:** Open Reporting Agent → Fetch Executions node → switch credential to pa-n8n-api → re-run test
3. **Kai:** Secure Phoenix Automation domain → set up Instantly.ai → then Haris builds Outreach Agent
4. **Before first real client:** Update Onboarding Automation for Option A (client self-serves n8n account)

### Files changed this session
- `PROJECT_OVERVIEW.md` — version 2.7, E2E PASS, pa-smtp updated, 4 new recurring bugs, Session 10 handoff

---

## Session Handoff — 2026-03-26 (Session 9)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
- **FIX 1 — Meridian Consulting:** Status Test Client set to `test-complete`. Meridian ClickUp folder created (ID: `90148117751`) with 4 lists (Onboarding, Build, QA, Live). Airtable record updated with correct folder ID.
- **FIX 2 — Status Update Agent (94DpGwRPWGRPqCVU):** `Split Client Records` node now filters out clients with null/empty `clickup_folder_id`. `Get All Tasks From Folder` URL changed from team-level (`/team/{id}/task?folder_id[]=`) to folder-specific (`/folder/{id}/task`) — eliminates cross-team task bleed.
- **FIX 3 — Onboarding welcome email (7RsRJIqBHFpWZoWM):** "I'll send exact instructions shortly" placeholder replaced with per-tool step-by-step instructions for: Airtable, Gmail, Calendly, QuickBooks, Buildium, Zapier, Typeform. Subject updated to "Action required: Set up your automation credentials". 5-business-day deadline added.
- **FIX 4 — `onboarding_started_at` (7RsRJIqBHFpWZoWM):** Added to Node 21 (Update Airtable Record) jsonBody — now written as `new Date().toISOString()` on every onboarding run.
- **Root cause confirmed for email pollution:** Not Meridian (`project_status=lead`) — was `Status Test Client` with `project_status=live` and `clickup_folder_id=90147969224` (Client Projects parent folder, not a client folder). Fixed.
- **PROJECT_OVERVIEW.md updated:** Known Issues resolved, TODO restructured, Session 9 handoff added.

### What is in progress (not finished)
- Step 6 of E2E test (Referral Trigger Agent) — Brightline test data still live and ready

### Blockers for next session
- Kai must run Referral Trigger Agent manually from n8n editor to complete Step 6
- Client n8n account model decision (Kai) — blocks Workflow Builder Agent scoping
- Haris not yet invited to n8n Cloud

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **Kai:** Run [PA] Referral Trigger Agent from n8n editor — verify `referral_sequence_sent=true` on Brightline record (`recNr32G2QJd5bbkw`) + entry in `automation_logs`
3. **Kai:** Re-run [PA] Status Update Agent — verify clean email (only Brightline tasks, no PA internal tasks)
4. **Kai/Haris:** Clean up Brightline test records after Step 6 confirmed
5. **Kai:** Decide client n8n account model (Option A vs B) — reply to Haris so Workflow Builder Agent scope can be written

### Files changed this session
- `PROJECT_OVERVIEW.md` — version 2.6, 4 Known Issues resolved, TODO restructured, Session 9 handoff
- `docs/clients/brightline-property-management/e2e-test-report.md` — updated Step 5 result + root cause, Step 6 instructions, bugs table expanded
- **n8n workflows updated (via API — no local file changes):**
  - `[PA] Status Update Agent` (94DpGwRPWGRPqCVU) — folder filter + endpoint fix
  - `[PA] Onboarding Automation` (7RsRJIqBHFpWZoWM) — welcome email + onboarding_started_at

---

## Session Handoff — 2026-03-25 (Session 8 — Q&A + findings)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
- [PA] Status Update Agent manually triggered by Haris from n8n editor — email received ✅
- Root cause identified for polluted Status Update email: Meridian Consulting still has `project_status=live` in Airtable — its ClickUp folder points to PA internal tasks, causing them to appear in client emails
- Three architectural gaps identified and documented:
  1. **Meridian Consulting pollution** — must set to `test-complete` immediately
  2. **Credential follow-up not automated** — "I'll send exact instructions shortly" in welcome email is placeholder text only; no follow-up workflow exists
  3. **Client n8n account model undecided** — Onboarding creates a stub label but doesn't provision a real n8n workspace for the client; decision needed before Workflow Builder Agent can be properly scoped
- Known Issues, TODO, and client n8n model note all updated in PROJECT_OVERVIEW.md

### What is in progress (not finished)
- [PA] Referral Trigger Agent manual test not yet done (Haris ran Status Update only this session)
- Brightline test records still live in Airtable — cleanup pending

### Blockers for next session
- Meridian Consulting `project_status` must be set to `test-complete` (Kai) before running any more Status Update tests
- Client n8n account model decision (Kai) blocks Workflow Builder Agent scoping and credential follow-up design
- Haris still not invited to n8n Cloud (Kai)

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **Kai — do these first:**
   - Set Meridian Consulting `project_status = "test-complete"` in Airtable
   - Run [PA] Referral Trigger Agent from n8n editor → verify `referral_sequence_sent=true` on Brightline record + entry in `automation_logs`
   - Decide client n8n model: Option A (each client owns account) or Option B (all in Kai's account)
   - Update Calendly URL in workflow `ka6GesSfWVo2FZtU` node "Build Claude Payload"
3. **Haris (after Kai completes above):** Build automated credential follow-up email workflow, then [PA] Reporting Agent

### Files changed this session
- `PROJECT_OVERVIEW.md` — version 2.5, 3 new Known Issues (Meridian pollution, credential gap, n8n model), TODO restructured with Kai urgency markers, client n8n note updated

---

## Session Handoff — 2026-03-24 (Session 7)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
- **[PA] Referral Trigger Agent** built via n8n API — ID: `ka6GesSfWVo2FZtU`, 13 nodes
  - Schedule trigger daily 08:00 + manual trigger
  - Fetches clients: `project_status=live`, `referral_sequence_sent_at=BLANK`, day 30 post-launch
  - Generates 2-touch referral email sequence via Claude (`claude-sonnet-4-20250514`)
  - Instantly.ai stubbed: logs `INSTANTLY_NOT_CONFIGURED` to `automation_logs` table
  - Sets `referral_sequence_sent_at` on completion (prevents re-firing)
  - False branch (no scope_of_work): also sets flag to prevent infinite daily re-check
- PROJECT_OVERVIEW.md updated: workflow registry, TODO, Known Issues, session handoff

### What is in progress (not finished)
- [PA] Referral Trigger Agent not yet tested — Instantly.ai stub in place, Calendly URL needs updating before test

### Blockers for next session
- Haris not yet invited to n8n Cloud (Kai action required)
- Outreach Agent blocked on Instantly.ai account + pa-instantly credential

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **Kai:** Invite Haris to n8n Cloud workspace
3. **Kai:** Update Calendly URL in [PA] Referral Trigger Agent — open workflow `ka6GesSfWVo2FZtU`, edit node "Build Claude Payload", replace `https://calendly.com/phoenixautomation/assessment` with real URL
4. **Kai:** Decide whether to add `automations_delivered` field to Airtable Clients table (currently uses `scope_of_work` as fallback)
5. **Kai:** Set up Instantly.ai account + domain — needed before Outreach Agent and Referral Trigger go live
6. **Haris (after n8n access):** QA all workflows visually in n8n Cloud editor, then build [PA] Reporting Agent

### Files changed this session
- `PROJECT_OVERVIEW.md` — version 2.3, Referral Trigger added to registry, TODO/Known Issues updated, Session 7 handoff

---

## Session Handoff — 2026-04-08 (Session 18 — Outreach HTML + Hunter.io + AI Research Agent)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
1. **[PA] Outreach Agent — branded HTML email template** — dark blue #1B2A4A header/footer matching Status Update Agent; single-quoted HTML attributes to avoid JSON escaping issues; Build HTML Emails Code node added between Parse Email Sequence and Add Lead to Instantly
2. **Critical Code node return format fix** — Parse Email Sequence and Build HTML Emails both used `return [{json:{...}}]` in `runOnceForEachItem` mode; n8n requires `return {json:{...}}` (no array wrapper) — fixed both nodes
3. **[PA] Lead Generation — Hunter.io migration** — replaced Apollo HTTP Request with Hunter.io domain-search (`/v2/domain-search?domain=&api_key=&type=personal&limit=10`); modular 3-node architecture: Target Domains → Fetch Leads — Hunter.io → Normalize Leads
4. **AI Research Agent added to Lead Gen** — replaces static Target Domains Code node; `@n8n/n8n-nodes-langchain.agent` (v1.7) uses GPT-4o-mini via n8n free OpenAI credits; system prompt describes full ICP; generates 8 real company domains per run, varied by date; Parse Research Output fallback to 3 known SMB domains
5. **Lead Gen field mapping fixed** — Split Into Items was using Apollo's nested format (`p.organization.name`, `p.title`); rewritten to pass through Normalize Leads' already-flat format (`prospect_name`, `company_name`, `job_title`)
6. **source field corrected** — Write New Prospect changed from `source: 'apollo'` to `source: 'hunter'`
7. **Empty-contact filter added** — Normalize Leads now skips contacts where both prospect_name AND job_title are empty (was keeping no-title contacts by default, allowing generic email addresses through)
8. **10 temp build scripts deleted** — fix_outreach.js, fix_parse_node.js, connect_apollo.js, upgrade_outreach_html.js, fix_instantly_body.js, add_html_node.js, fix_html_quotes.js, fix_return_format.js, switch_to_hunter.js, add_ai_research.js
9. **Tavily live web search added to Lead Gen** — Tavily Search Code node runs 3 parallel searches (DTC brands, marketing agencies, SaaS ops) via Tavily API (`tvly-dev-...`) before the AI Research Agent; live results injected into GPT prompt so agent works from real-time web data instead of training data; credential stored directly in Code node; Tavily free tier: 1000 searches/month

### What is in progress (not finished)
- **Outreach HTML email E2E not fully verified** — Instantly has 19 old duplicate leads in the campaign; new leads can't be added for those emails; personalization shows 0 chars. Exec 202 succeeded and Airtable shows `in_sequence` but Instantly side unverified
- **Lead Gen not yet re-run after all fixes** — AI Research Agent deployed but not manually tested end-to-end; some old bad rows (rows 7–14) still in Airtable from the broken run

### Blockers for next session
- **Instantly duplicate cleanup** — 19 old leads with same test emails block the outreach E2E test. Must delete them manually in Instantly dashboard (Leads tab → select all → delete), then re-trigger Outreach Agent with fresh pending prospects
- **Email warmup** — warmup_status: 0; enable in Instantly dashboard → Email Accounts → kai@phoenixautomation.ai → Warmup

### Next person should start with
1. **Kai:** In Instantly dashboard — delete all leads in the campaign with ashleyedwards305@gmail.com and muneebfiaz201@gmail.com; then re-run [PA] Outreach Agent manually
2. **Kai:** Enable email warmup for kai@phoenixautomation.ai in Instantly (Settings → Email Accounts → Warmup toggle)
3. **Haris:** Delete old Airtable prospect rows 7–14 (partial/bad records from today's broken run) then trigger [PA] Lead Generation manually to confirm AI Research Agent generates real ICP domains + Hunter.io returns named contacts
4. Read PROJECT_OVERVIEW.md for full context

### Files changed this session
- `PROJECT_OVERVIEW.md` — v4.5, Lead Gen + Outreach Agent updated in registry, Known Issues + In Progress updated, session handoff
- **n8n workflows updated via API (no local file changes):**
  - `[PA] Lead Generation` (YO3f5CL9bYbLTBgw) — Hunter.io swap, AI Research Agent, Split Into Items rewrite, source fix, empty-contact filter (17 nodes)
  - `[PA] Outreach Agent` (Mib6RUtJ2IOaUZ4s) — branded HTML email template, Build HTML Emails node, return format fix (12 nodes)

---

## Session Handoff — 2026-04-06 (Session 17 — Native AI Nodes + Workflow Audit)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
1. **Full workflow audit** — all 15 [PA] workflows checked; 9 were using raw HTTP Request to Anthropic API
2. **Native AI node migration — 9/9 workflows** — all Claude calls now use `@n8n/n8n-nodes-langchain.chainLlm` (Basic LLM Chain) + `@n8n/n8n-nodes-langchain.lmChatAnthropic` (Anthropic model sub-node) with the existing "Anthropic account" credential (`fKRThaHCAxKe1JBQ`)
3. **All response parsing code updated** — downstream Code nodes that read `$json.content[0].text` updated to `$json.text` (correct LLM Chain output format)
4. **Workflow Builder multi-automation support added** — now handles automation_2 for clients with multiple automations; IF node routes to second Claude chain + second deploy node + results merge
5. **Verified clean** — all 9 pass: no raw Anthropic HTTP, correct native node types, correct credential, no stale content references

### Workflows migrated to native AI nodes
| Workflow | Chain node name | Active |
|----------|----------------|--------|
| Status Update Agent | Claude — Email | YES |
| Scoping Agent | Claude — Scope | YES |
| Website Chatbot | Claude — Score Lead | YES |
| Outreach Agent | Claude — Email Sequence | YES |
| Scope Approval | Claude — Proposal | no |
| Workflow Builder Agent | Claude — Workflow 1 + Workflow 2 | no |
| Typeform Lead Qual | Claude — Score Lead | YES |
| Referral Trigger Agent | Claude — Referral Emails | no |
| Reporting Agent | Claude — Report | no |

### No-AI workflows — unchanged and correct
- [PA] Onboarding Automation — no AI needed (pure task orchestration)
- [PA] Error Handler — no AI needed
- [PA] Lead Generation — no AI needed (data fetching/dedup)
- [PA] Credential Follow-Up — no AI needed
- [PA] Credential Detector — no AI needed
- [PA] ClickUp Sync — no AI needed

---

## Session Handoff — 2026-04-03 (Session 16 — Full Cloud Automation Architecture)
**Worked by:** Haris + Claude (Claude Code VSCode)

### Architectural shift completed
The system is now fully cloud-based. automation-scoping-agent and workflow-builder-agent no longer require Claude Code running locally. Everything runs in n8n Cloud. Kai's only manual steps are: (1) approve scope via email link, (2) review + send proposal, (3) activate built workflows in client's n8n.

### New project_status flow
```
lead → call_complete → scoping → scope_review → proposal_sent
  → payment_confirmed → onboarding → onboarding.in_progress
  → build.ready → building → build_review → live
```

### What was built this session
1. **15 new Airtable fields** on Clients table: call_notes, scope_summary, automation_count, automation_1/2/3_name + description, scope_locked_at, proposal_draft, workflows_deployed, build_review_url
2. **5 new project_status values**: call_complete, scoping, scope_review, building, build_review
3. **[PA] Scoping Agent** (E24KwVMam1e8bbjT) — Kai posts call notes to /scope-call OR sets project_status=call_complete in Airtable → Claude generates full scope → writes to Airtable → emails Kai scope summary + Approve button
4. **[PA] Scope Approval** (UB6ZdrnYpJlYfxD4) — Kai clicks Approve in email → locks scope_locked_at → Claude writes proposal draft → saves to Airtable → emails Kai the draft to review and send
5. **[PA] Workflow Builder Agent** (fy8OuUEGyyWhYzWC) — polls build.ready clients hourly → reads scope from Airtable → Claude generates n8n workflow JSON → deploys to client's n8n via their API key → sets build_review → emails Kai direct links to review workflows

### Kai's new end-to-end flow (post-session 16)
1. After assessment call: POST call notes to https://kaiashley.app.n8n.cloud/webhook/scope-call (or set project_status=call_complete + fill call_notes in Airtable)
2. Receive scope review email → click Approve → proposal draft emailed automatically
3. Review proposal → send to client yourself
4. Client pays → Onboarding Automation fires automatically
5. Credentials arrive → Credential Detector sets build.ready automatically
6. Workflow Builder deploys workflows to client's n8n automatically → Kai receives review email
7. Review workflows in client's n8n → activate them

### New n8n workflows — IDs
| Workflow | ID | Webhook |
|----------|----|---------|
| [PA] Scoping Agent | `E24KwVMam1e8bbjT` | POST /scope-call |
| [PA] Scope Approval | `UB6ZdrnYpJlYfxD4` | GET /approve-scope?client_slug=X |
| [PA] Workflow Builder Agent | `fy8OuUEGyyWhYzWC` | polls Airtable hourly |

### Files changed this session
- `PROJECT_OVERVIEW.md` — v4.3
- **Airtable:** 15 new fields on Clients table, 5 new project_status values
- **n8n:** 3 new workflows created, all connected to Error Handler

---

## Session Handoff — 2026-04-03 (Session 15 — Gap Closure + Lead Readiness)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
1. **Full project audit vs blueprint** — confirmed 2 blueprint gaps (chatbot, credential handoff) + verified proposal-drafting-agent is fully built (no gap)
2. **[PA] Credential Detector built** — ID: hbtSbm2pzrHX1QTn, 10 nodes; polls every 2h for clients with onboarding.in_progress + n8n_api_key populated → auto-sets project_status=build.ready → emails Kai "start the build"; connected to Error Handler
3. **[PA] Website Chatbot built** — ID: EPMCxdqKOuwc6hzB, 15 nodes; stateless webhook /website-chatbot; accepts step + context; routes step 0–2 (questions), step 3 → Claude scoring (hot/cold/borderline) → writes hot prospects to Airtable + returns Calendly link; connected to Error Handler
4. **Chat embed widget created** — docs/website-chatbot-embed.html; copy/paste snippet, CORS-enabled, animated typing indicator, clickable Calendly link, mobile-friendly; CONFIGURE: change WEBHOOK_URL to prod after activating
5. **Mock client created** — docs/clients/sarahs-wellness-studio/; process-map.md + scope-of-work.md for Typeform program admission use case; fully scoped for workflow-builder-agent test run; estimated $2,400 Starter Build, 7–12 hrs/week saved for client
6. **PROJECT_OVERVIEW.md v4.2** — all new workflows added to registry + node summaries; Known Issues updated; activation order updated

### Workflow IDs — new this session
| Workflow | ID | Notes |
|----------|----|-------|
| [PA] Credential Detector | `hbtSbm2pzrHX1QTn` | Activate with other core workflows |
| [PA] Website Chatbot | `EPMCxdqKOuwc6hzB` | Activate + embed widget on website |

### What Kai must do next
1. **Activate workflows** (full updated order now in TODO section above)
2. **Embed chat widget** — open docs/website-chatbot-embed.html, copy the marked section, paste before `</body>` on your website. After activating [PA] Website Chatbot in n8n, the production URL is `https://kaiashley.app.n8n.cloud/webhook/website-chatbot`
3. **Test mock client pipeline** — run workflow-builder-agent in Claude Code against docs/clients/sarahs-wellness-studio/scope-of-work.md to validate the full delivery pipeline
4. **Connect Stripe webhook** (see previous session)

### Files changed this session
- `PROJECT_OVERVIEW.md` — v4.2
- `docs/website-chatbot-embed.html` — new: embeddable chat widget
- `docs/clients/sarahs-wellness-studio/process-map.md` — new: mock client process map
- `docs/clients/sarahs-wellness-studio/scope-of-work.md` — new: mock client scope of work
- **n8n changes (via API):**
  - [PA] Credential Detector created (hbtSbm2pzrHX1QTn) — errorWorkflow connected
  - [PA] Website Chatbot created (EPMCxdqKOuwc6hzB) — errorWorkflow connected

---

## Session Handoff — 2026-04-01 (Session 14 — Launch Readiness)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
1. **ClickUp API key updated** — credential hLrtpicYXOOXrUh0 updated with new key; ClickUp API confirmed live (team 90141018999)
2. **Typeform webhook re-enabled** — pa-n8n-intake set to enabled: true via API
3. **Typeform Calendly URL fixed** — thank-you screen redirect updated from placeholder to real Calendly URL
4. **pa-instantly credential created** — ID: xoSojCyLffw4nNe7 (httpHeaderAuth, Bearer token)
5. **[PA] Outreach Agent built** — ID: Mib6RUtJ2IOaUZ4s, 12 nodes; daily 07:00 + manual; generates 3-email sequence per prospect via Claude → queues in Instantly → updates Airtable
6. **[PA] Error Handler built** — ID: JByknkdAgxRmDKp3, 4 nodes; Error Trigger → Format → Log Airtable → Email Kai
7. **Error handler connected to all 9 PA workflows** — errorWorkflow: JByknkdAgxRmDKp3 confirmed on every workflow
8. **automation_logs fixes** — ClickUp Sync log node converted from Code → HTTP POST (now actually writes to Airtable); Referral Trigger log node updated with event/client/timestamp fields
9. **workflow-builder-agent.md prerequisites** — added build.ready gate + n8n_api_key check at top of agent file; committed
10. **Full pre-launch verification** — all 15 checks run; all pass except Instantly campaign (expected — Kai creates it)

### Instantly.ai note
Email account `kai@phoenixautomation.ai` is connected (warmup_status: 0 = warming up). No campaigns exist yet. Before activating [PA] Outreach Agent, Kai must:
1. Create a campaign in Instantly UI (app.instantly.ai → Campaigns → New)
2. Copy the campaign ID from the campaign URL
3. Open [PA] Outreach Agent in n8n → node "Add Lead to Instantly" → update `campaign_id` value

### Blockers for next session
- Kai must activate 6 workflows (in order: Error Handler → Typeform Lead Qual → Credential Follow-Up → Referral Trigger → ClickUp Sync → Outreach Agent after campaign setup)
- Stripe webhook connection (for automated onboarding trigger on payment)
- First real client needed for real data validation

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **KAI ACTIVATION ORDER (in n8n Cloud):**
   a. [PA] Error Handler (JByknkdAgxRmDKp3) — safe to activate immediately
   b. [PA] Typeform Lead Qualification (kXxN7O77ongTMwKG) — starts scoring inbound leads
   c. [PA] Credential Follow-Up (uTnQAq5VlmsHYih4) — starts daily alerts for stalled onboarding
   d. [PA] Referral Trigger Agent (ka6GesSfWVo2FZtU) — starts 30-day post-launch referral
   e. [PA] ClickUp Sync (uiTwYIUk6nIFwLtX) — syncs task statuses every 2 hours
   f. [PA] Credential Detector (hbtSbm2pzrHX1QTn) — auto-promotes build.ready when client submits credentials
   g. [PA] Website Chatbot (EPMCxdqKOuwc6hzB) — activate, then paste embed snippet from docs/website-chatbot-embed.html into website before </body>
   h. [PA] Outreach Agent (Mib6RUtJ2IOaUZ4s) — campaign_id configured ✅ — activate only after email warmup (≥14 days)
3. ~~**KAI:** Create Instantly campaign → update campaign_id in Outreach Agent node "Add Lead to Instantly"~~ ✅ DONE 2026-04-01 (campaign_id: 6817d31e-e8e6-4a09-87de-e3be8e7cfc4e)
4. **KAI:** Connect Stripe webhook: Dashboard → Webhooks → Add endpoint → URL: https://kaiashley.app.n8n.cloud/webhook/payment-confirmed → Event: payment_intent.succeeded
5. **KAI (mock client test):** To test the full build pipeline with a mock client — run workflow-builder-agent in Claude Code, pointing at docs/clients/sarahs-wellness-studio/scope-of-work.md. This validates the entire delivery pipeline without a real client.

### Files changed this session
- `PROJECT_OVERVIEW.md` — v4.1, full update: new workflows, credentials, Known Issues, TODO
- `workflow-builder-agent.md` — prerequisites section added (committed separately)
- **n8n changes (via API):**
  - ClickUp credential hLrtpicYXOOXrUh0: key updated
  - Typeform webhook pa-n8n-intake: enabled
  - Typeform form RSsWJkcf: thank-you screen Calendly URL updated
  - pa-instantly credential created (xoSojCyLffw4nNe7)
  - [PA] Outreach Agent created (Mib6RUtJ2IOaUZ4s)
  - [PA] Error Handler created (JByknkdAgxRmDKp3)
  - All 9 PA workflows: errorWorkflow = JByknkdAgxRmDKp3 set
  - [PA] ClickUp Sync: Log Sync Summary converted to Airtable HTTP POST
  - [PA] Referral Trigger Agent: log node updated with event/client/timestamp

---

## Session Handoff — 2026-04-01 (Session 13 — Full System Audit)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
- **Full live system audit** — queried n8n, Airtable, Instantly, Typeform APIs to verify every workflow, credential, and data layer
- **automation_logs Airtable** — added 4 missing fields: event (`fldLJJlsN4YaEwM1h`), client (`fldAN5uJmukAgaJM4`), notes (`fldszrHm2ZvTPlaMu`), timestamp (`fldQq93QdesxwZszk`) — newer workflows (Credential Follow-Up, ClickUp Sync) were silently failing to log properly
- **Clients table** — added `n8n_api_key` field (`fldxqbU9PIVvurgPl`) — required for workflow-builder-agent to connect to client n8n instances
- **Test data cleaned** — Alice Test, Bob Sample, Carol Demo prospects set to `test-complete`; "Test Company" client set to `closed.no_deal`
- **PROJECT_OVERVIEW.md v4.0** — Known Issues, TODO, Airtable schema, workflow status all updated from audit findings

### Key audit findings (live API)
| Item | Finding |
|------|---------|
| n8n workflows | 8 built; 3 active (Onboarding, Lead Gen, Status Update); 5 inactive awaiting Kai activation |
| [PA] Outreach Agent | NOT BUILT — Instantly has 0 sending accounts |
| Error handling workflow | NOT BUILT |
| ClickUp API key | Expired (OAUTH_025) — all ClickUp Sync executions will fail until regenerated |
| Typeform webhook | Disabled — workflow inactive caused Typeform to auto-disable it |
| automation_logs | Was missing 4 fields — fixed this session |
| Instantly.ai | 0 sending accounts, 0 campaigns — unconfigured |
| Apollo.io | Free plan — Lead Gen is mock (3 synthetic contacts only) |

### Blockers for next session
- Kai must activate 4 workflows + regenerate ClickUp key before any of them can run
- Instantly sending account needed before Outreach Agent can be built
- Typeform webhook re-enable must happen after Typeform Lead Qual workflow is activated

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **KAI ACTIONS (in order):**
   a. Regenerate ClickUp API key → update n8n credential hLrtpicYXOOXrUh0
   b. Activate [PA] Typeform Lead Qualification (kXxN7O77ongTMwKG)
   c. Re-enable Typeform webhook: `PUT /forms/RSsWJkcf/webhooks/pa-n8n-intake` with `{"url":"https://kaiashley.app.n8n.cloud/webhook/typeform-intake","enabled":true}` + Typeform Bearer token
   d. Activate [PA] Credential Follow-Up (uTnQAq5VlmsHYih4)
   e. Activate [PA] Referral Trigger Agent (ka6GesSfWVo2FZtU)
   f. Activate [PA] ClickUp Sync (uiTwYIUk6nIFwLtX) — after ClickUp key is updated
3. **KAI:** Set up Instantly sending account (Settings → Email Accounts → Connect in Instantly UI)
4. **Haris (after Instantly account):** Build [PA] Outreach Agent

### Files changed this session
- `PROJECT_OVERVIEW.md` — v4.0, audit findings, new Known Issues, Airtable schema updated
- **Airtable changes (via API):**
  - automation_logs: 4 fields added (event, client, notes, timestamp)
  - Clients: 1 field added (n8n_api_key)
  - Prospects: Alice, Bob, Carol set to test-complete
  - Clients: Test Company set to closed.no_deal

---

## Session Handoff — 2026-03-31 (Session 12)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
- **[PA] Onboarding Automation Node 49 updated** — subject changed to "Welcome to Phoenix Automation — action required before we can start"; new "Step 1 — Set up your n8n account" section inserted before "Your next steps" (n8n.io signup, API key creation, reply with URL + key); all 3 verification checks ✅
- **[PA] Credential Follow-Up built** — ID: `uTnQAq5VlmsHYih4`, 11 nodes, daily 10:00 + manual; fetches Airtable clients stalled >48h on onboarding.in_progress; IF skip if already flagged <24h; emails Kai with company/contact/hours overdue; PATCH overdue_flagged_at; logs to automation_logs; continueOnFail on all HTTP nodes; inactive
- **[PA] Typeform Lead Qualification built** — ID: `kXxN7O77ongTMwKG`, 13 nodes (prior session); Typeform webhook registered (tag: pa-n8n-intake, secret: pa-typeform-2026); Typeform form created (ID: RSsWJkcf)
- **PROJECT_OVERVIEW.md updated** to v3.5 — Credential Follow-Up registered, node summary added, TODO items marked complete

### What is in progress (not finished)
- Gap analysis not yet run (was deferred from this session)

### Blockers for next session
- Outreach Agent still blocked on Instantly.ai
- Update Workflow Builder Agent scope: prerequisite — client n8n API key + instance URL in Airtable `n8n_workspace_id` before agent runs

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **KAI:** Activate [PA] Credential Follow-Up (`uTnQAq5VlmsHYih4`) — no dependencies, safe to activate immediately
3. **KAI:** Activate [PA] Typeform Lead Qualification (`kXxN7O77ongTMwKG`) — Typeform webhook is registered and ready
4. **KAI:** Update Calendly URL in Referral Trigger Agent (workflow `ka6GesSfWVo2FZtU`, node "Build Claude Payload")
5. **Haris:** Update Workflow Builder Agent scope — add prerequisite: client n8n API key + instance URL must be in Airtable before build starts
6. **Haris:** Full gap analysis of all project files (read-only — was deferred)

### Files changed this session
- `PROJECT_OVERVIEW.md` — v3.5, Credential Follow-Up registered, Node 49 update noted, 2 TODO items marked complete, session handoff
- **n8n workflows updated (via API — no local file changes):**
  - `[PA] Onboarding Automation` (7RsRJIqBHFpWZoWM) — Node 49 subject + n8n setup section
  - `[PA] Credential Follow-Up` (uTnQAq5VlmsHYih4) — created new

---

## Session Handoff — 2026-03-24 (Session 6)
**Worked by:** Kai + Claude (Claude Code)

### What was completed
- n8n Cloud instance set up at kaiashley.app.n8n.cloud (Business Foundry project)
- All 3 PA workflows imported to cloud:
  - [PA] Onboarding Automation → `7RsRJIqBHFpWZoWM`
  - [PA] Status Update Agent → `94DpGwRPWGRPqCVU`
  - [PA] Lead Generation → `YO3f5CL9bYbLTBgw`
- Post-import audit completed — found and fixed:
  1. Status Update Agent: 2 broken connections (Split Client Records → Get All Tasks From Folder; Get All Tasks From Folder → Merge/Error Skip)
  2. Onboarding Automation: hardcoded Airtable PAT in Update Airtable Record replaced with `predefinedCredentialType: airtableTokenApi`
- All credential bindings confirmed auto-linked on import (pa-airtable, pa-clickup, pa-smtp, pa-anthropic all resolved)
- No localhost URLs found in any workflow — all clean
- PROJECT_OVERVIEW.md updated: cloud IDs, n8n URL, MCP path, version bump

### What is in progress (not finished)
- [PA] Status Update Agent not yet test-executed (n8n Cloud API has no direct execute endpoint for non-webhook workflows — test via editor)

### Blockers for next session
- Haris not yet invited to n8n Cloud (Kai action)
- Outreach Agent blocked on Instantly.ai account

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. Open n8n Cloud editor and run manual test of [PA] Status Update Agent (ensure Status Test Client has `project_status=live` and `clickup_folder_id=90147969224` first)
3. Invite Haris to n8n Cloud workspace

### Files changed this session
- `PROJECT_OVERVIEW.md` — version 2.2, cloud IDs, n8n URL, MCP path, Session 6 handoff

---

## Session Handoff — 2026-03-22 (Session 5)
**Worked by:** Kai + Haris (via Claude Code)

### What was completed
- [PA] Onboarding Automation end-to-end test: **PASS** (execution 209)
  - ClickUp folder + 4 lists (Onboarding/Build/QA/Live) confirmed created
  - `clickup_folder_id` written to Airtable, both emails sent
- Bugs found and fixed during testing:
  1. ClickUp API v2 doesn't support nested folders — changed to `POST /api/v2/space/90144568071/folder` (space level)
  2. HTTP list creation nodes: wrong `jsonBody` expression format — fixed to plain JSON strings
  3. Airtable `filterByFormula` single-quote bug — fixed to double quotes
  4. `Extract Tools Required` hard error on empty tools — changed to graceful warn + 3-level fallback
- Discovered stable n8n API key: "FlowPilot OS" (no expiry). "phoenix-local" key has `exp` claim and is unreliable.
- Confirmed ClickUp API key: `pk_198267967_P2B3ZQTSNOTEJO5BVZ83PQBU3V0M3R2B` (from decrypted pa-clickup credential)
- Cleaned up test ClickUp folder (90147998711 deleted), Status Test Client Airtable record reset to test-complete
- Workflow deactivated after testing (as per project rules)

### Blockers for next session
- Haris does not have n8n access yet (Kai setting up n8n Cloud)
- Outreach Agent blocked on Instantly.ai
- Meridian test record has stale n8n workspace/credentials IDs — clean before first real client

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **Kai:** Plan client n8n model session — onboarding flow needs updating before first real client
3. **Haris:** Build [PA] Reporting Agent once n8n Cloud access is ready

### Files changed this session
- `docs/clients/phoenix-automation/build-log.md` — updated [PA] Onboarding Automation status, node list, test results, bugs fixed
- `docs/setup/clickup-structure.md` — updated structure to reflect space-level folders (ClickUp API constraint)
- `PROJECT_OVERVIEW.md` — version 2.1, Known Issues updated, TODO updated, Session 5 handoff added

---

## Session Handoff — 2026-03-22 (Session 4)
**Worked by:** Kai + Haris (via Claude Code)

### What was completed
- 10 Airtable Clients fields added (n8n_workflow_ids, hours_saved_per/week/year, last_month_executions/errors, total_executions, referral_source, referral_sequence_sent, lead_score_total, pre_call_brief)
- `clickup_project_id` renamed to `clickup_folder_id` in Airtable + both workflows
- [PA] Onboarding Automation updated: replaces folderless list with folder + 4 lists (Onboarding, Build, QA, Live). Now 24 nodes.
- [PA] Status Update Agent updated: reads all tasks from folder via team API (`folder_id[]` param). Now 15 nodes.

### Blockers for next session
- Haris does not have n8n access yet (Kai setting up n8n Cloud)
- Outreach Agent blocked on Instantly.ai

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. Test onboarding automation end-to-end (completed in Session 5)

### Files changed this session
- Airtable Clients table: 10 new fields added, `clickup_project_id` renamed to `clickup_folder_id`
- n8n workflow 7RsRJIqBHFpWZoWM: 24 nodes (replaced ClickUp folderless node with folder+4-lists structure)
- n8n workflow 94DpGwRPWGRPqCVU: 15 nodes (updated to read folder tasks, renamed clickup field references)

---

## Session Handoff — 2026-03-20 (Session 3)
**Worked by:** Haris (via Claude Code VSCode)
**Duration:** ~1 session

### What was completed
- 4 missing Airtable Clients fields added via API: proposal_value (fldBKINuYvLuDcmO6), project_launch_date (fldx8qb1MERAwjvJW), last_report_sent_at (fldIhkhfcW1py0A69), referral_sequence_sent_at (fldWq5wBqGqlBBuuY)
- Notes field confirmed already exists as default Airtable field (fld3YqOzRo6gufQbW) — no action needed
- ClickUp Client Projects folder created (ID: 90147969224)
- ClickUp [PA] Client Template list created with 7 tasks (list ID: 901414699447)
- ClickUp Internal folder created (ID: 90147969240)
- ClickUp Lead Management list created with 3 tasks (ID: 901414699479)
- ClickUp Operations list created with 3 tasks (ID: 901414699480)
- PROJECT_OVERVIEW.md updated: Airtable schema, ClickUp IDs, TODO marked done

### What is in progress (not finished)
- 10 proposed Clients fields (for reporting/referral agents) not yet added — waiting on Kai decision
- Onboarding automation still creates folderless lists — needs update to use new folder structure

### Blockers for next session
- Haris does not yet have n8n access (Kai setting up n8n Cloud)
- Outreach Agent blocked on Instantly.ai account

### Next person should start with
1. Pull latest main: `git pull origin main`
2. Read PROJECT_OVERVIEW.md in full
3. **Kai:** Review docs/setup/clickup-structure.md decisions — particularly: update onboarding automation to use folder+4-lists structure?
4. **Kai:** Review docs/setup/airtable-structure.md — confirm 10 proposed fields before reporting-agent build
5. **Haris:** Build [PA] Reporting Agent (scope ready at docs/workflows/build-scopes/reporting-agent-scope.md) once n8n Cloud is available

### Files changed this session
- PROJECT_OVERVIEW.md (Airtable schema updated, ClickUp IDs added, TODO updated, session handoff added)

---

## Session Handoff — 2026-03-20 (Session 2)
**Worked by:** Haris (via Claude Code VSCode)
**Duration:** ~1 session

### What was completed
- Airtable structure blueprint written: docs/setup/airtable-structure.md (all 3 tables, 52 total fields when complete, 5 missing + 10 proposed fields identified, decisions flagged)
- ClickUp structure blueprint written: docs/setup/clickup-structure.md (full folder/list/task definition, onboarding automation change spec, decisions flagged)
- Haris's machine details updated in PROJECT_OVERVIEW.md (OS, Node, Git, Claude Code versions)
- PROJECT_OVERVIEW.md updated: setup files referenced in file structure, TODO updated, new session handoff added

### What is in progress (not finished)
- Airtable: blueprint exists but fields not yet added to Airtable (needs credentials to call API)
- ClickUp: blueprint exists but folders/lists not yet created (needs ClickUp API key)

### Blockers for next session
- Haris needs Kai's Airtable PAT and ClickUp API key to add the 5 missing fields and create the Internal folder/lists
- Haris does not yet have n8n access (Kai setting up n8n Cloud)

### Next person should start with
1. Pull latest main: `git pull origin main`
2. Read PROJECT_OVERVIEW.md in full
3. **Kai:** Review docs/setup/airtable-structure.md — confirm all 6 decisions, then share Airtable PAT so Haris can add fields
4. **Kai:** Review docs/setup/clickup-structure.md — confirm 5 decisions, then share ClickUp API key so Haris can create Internal folder and lists
5. **Kai:** Confirm whether to update onboarding automation to use folder+4-lists structure before first client
6. **Haris (after API keys):** Add 5 missing Airtable fields, then create ClickUp Internal folder and lists

### Files changed this session
- docs/setup/airtable-structure.md (new)
- docs/setup/clickup-structure.md (new)
- PROJECT_OVERVIEW.md (updated: file structure, TODO, session handoff, Haris machine details)

---

## Session Handoff — 2026-03-20
**Worked by:** Kai + Haris
**Duration:** ~2 days of sessions

### What was completed
- [PA] Lead Generation dedup bug fixed and confirmed working (execution 180)
- [PA] Status Update Agent built, all bugs fixed, branded emails working
- pa-anthropic credential added to n8n
- client_timezone + last_status_update_sent_at fields added to Airtable Clients table
- PROJECT_OVERVIEW.md v2 created with full context

### What is in progress
- Kai setting up n8n Cloud for Haris access

### Blockers for next session
- Haris cannot work in n8n until Kai completes Cloud setup
- Outreach Agent blocked until Instantly.ai account is created

### Next person should start with
1. Pull latest main: `git pull origin main`
2. Read PROJECT_OVERVIEW.md in full
3. Run smoke test in Claude Code
4. Haris: Add 5 missing Airtable fields + set up ClickUp structure
5. Kai: Complete n8n Cloud setup and invite Haris

### Files changed this session
- PROJECT_OVERVIEW.md (this file)
- Airtable Clients table (2 new fields via API)
- n8n workflows: 94DpGwRPWGRPqCVU (multiple node fixes)

---

# Change Log

- **[2026-03-31]** — Typeform intake form created (RSsWJkcf, 6 fields), [PA] Typeform Lead Qualification workflow built (kXxN7O77ongTMwKG, 13 nodes), webhook registered with Typeform (pa-n8n-intake, secret: pa-typeform-2026). Scores leads A–D via Claude, emails Kai on Grade A/B.
- **[2026-03-31]** — Live n8n audit via API: confirmed Onboarding, Status Update Agent, Lead Generation all active and running on schedule. [PA] Reporting Agent (scj61gBYYWpQydMC, 16 nodes) confirmed built and present — was missing from docs. Registry, TODO, node summaries updated. project_status singleSelect: all 11 new values added via typecast:true.
- **[2026-03-27]** — Session 12: 28 new Airtable fields, Onboarding Automation 31→51 nodes (23 tasks + Extract Task IDs + mark-complete), ClickUp Sync built (18 nodes), Status Update Agent 15→20 nodes, workflow-builder-agent.md + qa-agent.md updated with Airtable/ClickUp rules
- **[2026-03-22]** — 10 Airtable Clients fields added (reporting/referral agents); `clickup_project_id` renamed to `clickup_folder_id`; [PA] Onboarding Automation updated to create ClickUp folder+4-lists (24 nodes); [PA] Status Update Agent updated to read all folder tasks (15 nodes)
- **[2026-03-20]** — PROJECT_OVERVIEW.md v2: added node summaries, recurring bugs reference, session handoff template, environment setup details, email addresses, common startup errors
- **[2026-03-20]** — [PA] Status Update Agent built and tested (14 nodes, ID: 94DpGwRPWGRPqCVU); branded HTML emails; ClickUp integration; pa-anthropic added; client_timezone + last_status_update_sent_at added to Clients table
- **[2026-03-20]** — [PA] Lead Generation dedup fully resolved; execution 180: 3 processed, 1 skipped, 2 written
- **[2026-03-20]** — n8n Cloud decision: ~$20/mo Starter plan for shared team access
- **[2026-03-19]** — PROJECT_OVERVIEW.md v1 created
- **[2026-03-19]** — [PA] Lead Generation built (11 nodes, ID: YO3f5CL9bYbLTBgw); Prospects + automation_logs tables created; lead gen agent files validated
- **[2026-03-19]** — Haris joined; setup complete; lead gen branch merged to main
- **[2026-03-17]** — Client slug bug fixed; execution 160 confirmed
- **[2026-03-17]** — Dual email redesign; execution 159 17/17 pass
- **[2026-03-17]** — Nodes 7+11 redesigned for community edition; execution 158 17/17 pass
- **[2026-03-17]** — E2E test (Meridian Consulting Group); credentials_checklist field added
- **[2026-03-17]** — QA conditional pass on [PA] Onboarding Automation; SMTP fixed
- **[2026-03-17]** — [PA] Onboarding Automation variables hardcoded
- **[2026-03-16]** — n8n-MCP connected via local build; auth conflict resolved
- **[2026-03-16]** — [PA] Onboarding Automation built (17 nodes, ID: 7RsRJIqBHFpWZoWM)
- **[2026-03-16]** — Agent builder run: 6 definitions, 6 SOPs, 5 scopes
- **[2026-03-16]** — Airtable Clients table structured; 4 credentials added; local dev stack operational
- **[2026-03-15]** — Simulation 2 (Northgate Legal): 7/11 issues CLOSED; Agent Builder designed
- **[2026-03-14]** — Correction/spec layer + coordination layer + 5 delivery agents
- **[2026-03-14]** — Blueprint Agent (Layer 1) complete; Phoenix Automation blueprint validated

## Session Handoff — 2026-03-27 (Session 11)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
- **FIX 1 — ClickUp space renamed** to "Phoenix Automation" (color #1B2A4A) — space 90144568071
- **FIX 2 — Client folders recreated with full task seeding:**
  - Deleted stale root-level folders (old BPM 90148085794, old MCG 90148117751)
  - Created brightline-property-management (90148144284) + 4 lists + 7 tasks seeded
  - Created meridian-consulting-group (90148144286) + 4 lists + 7 tasks seeded
  - ⚠️ ClickUp v2 API limitation confirmed: `POST /folder/{id}/folder` returns 404 — folders must be created at space root, not nested under Client Projects. Documented in Recurring Bugs.
- **FIX 3 — Airtable: 4 new fields added** (clickup_list_onboarding/build/qa/live) and Brightline + Meridian records updated with all new IDs
- **FIX 4 — Onboarding Automation updated** (24 → 31 nodes):
  - Nodes 19–25: 7 task seeding HTTP POST nodes (auto-seeds tasks into all 4 lists)
  - Node 26 (Merge ClickUp Folder ID): now captures all 4 list IDs alongside folder ID
  - Node 27 (Log ClickUp Error): now sets all 4 list IDs to null on error path
  - Node 28 (Update Airtable Record): now writes clickup_list_onboarding/build/qa/live + onboarding_started_at
- **FIX 5 — Airtable cleanup:**
  - Deleted 3 blank/junk rows (rec7XfoO4a8sjZFTW, recWakBWZEMEu2wG2, reczHE2U5O52aB6Sd)
  - Status Test Client: slug fixed to "status-test-client", clickup_folder_id cleared
- **Welcome email fix** (from Session 10 continuation): removed "reply with credentials" CTA, added security notice, welcome + follow-up framing
- **Full ClickUp audit completed:** space structure, workflow node audit, Airtable field audit, edge case analysis — all documented
- **Calendly clarified:** API key not needed for current scope — webhook-only integration sufficient
- **Instantly.ai API key received** (MWFiM2VjZjMtYWEwYy00YWQ1LWEzYTMtNWNkOWMwYzc5MmViOmFVSkNIYlFSbGNlbQ==) — pa-instantly credential ready to set up
- **Session 11 continuation (same date):**
  - Tested ClickUp list template `t-901414909247` — confirmed template does NOT auto-seed tasks (both test lists created via `template_id` param had `task_count: 0`). Decision: keep 31-node workflow with individual task seeding as-is.
  - Deleted 4 lists: 2 template test lists (901414909658, 901414909660) + 2 stale space-root lists (meridian-consulting-group 901414583912, ashley-edwards 901414584147)
  - Status Update Agent TASK URL verified: `folder_ids[]` (with 's') — correct. Fixed typo in PROJECT_OVERVIEW.md description (was `folder_id[]`).

### What is in progress (not finished)
- Referral Trigger Agent E2E Step 6 still pending — Brightline is test-complete so filter returns empty. Kai needs to temporarily set to `live`, run the agent, then revert.
- Reporting Agent: Fetch Executions node credential needs switching to pa-n8n-api

### Blockers for next session
- Brightline referral test: must temporarily set `project_status=live` to test
- Instantly.ai credential: set up pa-instantly in n8n before Outreach/Referral agents can send live emails

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **Kai:** Set up pa-instantly credential in n8n using key MWFiM2VjZjMtYWEwYy00YWQ1LWEzYTMtNWNkOWMwYzc5MmViOmFVSkNIYlFSbGNlbQ==
3. **Kai:** Set Brightline `project_status=live` → run Referral Trigger Agent → verify → revert to test-complete
4. **Kai:** Set up Calendly webhook → paste n8n webhook URL in Calendly → Integrations → Webhooks (no API key needed)
5. **Haris:** Build [PA] Reporting Agent (scope ready in docs/workflows/build-scopes/)
6. **Haris:** Build automated credential collection follow-up email workflow (unblocked)

### Files changed this session
- `PROJECT_OVERVIEW.md` — version 2.9, template test conclusion, 4 stale lists deleted, Status Update Agent URL typo fixed, Session 11 continuation handoff

---

## Session Handoff — 2026-03-27 (Session 12)
**Worked by:** Haris + Claude (Claude Code VSCode)

### What was completed
- **Part 1 — Airtable Schema:**
  - 21 new `clickup_task_*` singleLineText fields added (all task IDs across Onboarding/Build/QA/Live lists)
  - 7 new supporting fields added: `workflows_built`, `qa_verdict`, `overdue_flagged_at`, `build_started_at`, `build_completed_at`, `qa_started_at`, `qa_completed_at`
  - ✅ `project_status` singleSelect: all 11 new values added via Records API typecast:true — no manual step required

- **Part 2 — Onboarding Automation (7RsRJIqBHFpWZoWM) updated: 31 → 51 nodes:**
  - Replaced 7 wrong-name seed tasks with 23 properly named tasks (9 onboarding + 4 build + 5 QA + 7 live matching clickup-structure.md exactly)
  - Added `Extract All Task IDs` Code node — maps all 23 task creation responses to `clickup_task_*` field names
  - Updated `Merge ClickUp Folder ID` to read from `Extract All Task IDs`
  - Updated `Update Airtable Record` to write all 21 clickup_task_* fields + 4 list IDs
  - Added 3 mark-complete HTTP nodes: OB Airtable, OB Internal, OB Welcome (mark complete after each action fires)

- **Part 3 — workflow-builder-agent.md updated:**
  - Added `## Airtable Status Updates` section (build.in_progress → build.complete → build.blocked)
  - Added `## ClickUp Task Rules` section (never update ClickUp directly; exception: blocked comment)

- **Part 4 — qa-agent.md updated:**
  - Added `## Airtable Status Updates` section (qa.in_progress → qa.pass/fail)
  - Added `## ClickUp Task Rules` section (comment to clickup_task_qa_verdict after verdict)

- **Part 5 — [PA] ClickUp Sync built (ID: uiTwYIUk6nIFwLtX, 18 nodes, inactive):**
  - Every 2 hours: reads Airtable active clients, syncs ClickUp task statuses
  - All 10 project_status cases handled via Code node switch statement
  - Email notifications: onboarding overdue (>48h), build.blocked, qa.pass, qa.fail
  - Airtable update: overwrites `overdue_flagged_at` (rate-limited to once per 24h)
  - Uses pa-airtable, pa-clickup, pa-smtp credentials

- **Part 6 — Status Update Agent (94DpGwRPWGRPqCVU) updated: 15 → 20 nodes:**
  - After Airtable update: new Determine ClickUp Task Update code node
  - IF Has Task Update → PUT ClickUp Task Complete (marks live_status_confirmed complete)
  - IF Has Comment → POST ClickUp Comment ("Weekly status email sent to client — [date]")

- **Verification passed:**
  - All 6 parts verified via API checks
  - ClickUp Sync test: test-complete excluded ✅, live status included ✅
  - Brightline restored to test-complete ✅

### What is in progress (not finished)
- project_status singleSelect: ✅ RESOLVED — all 11 new values added via typecast:true
- [PA] ClickUp Sync: built and verified but not activated — Kai's decision
- Reporting Agent: scope ready but not built

### Blockers for next session
- Instantly.ai not set up — blocks Outreach Agent and Referral Trigger live sends

### Next person should start with
1. `git pull origin main` then read PROJECT_OVERVIEW.md
2. **KAI:** Activate [PA] ClickUp Sync (ID: `uiTwYIUk6nIFwLtX`) in n8n — all project_status values now exist in Airtable
3. **KAI:** Set up pa-instantly credential in n8n
5. **Haris:** Build [PA] Reporting Agent (scope ready in docs/workflows/build-scopes/)

### Files changed this session
- `PROJECT_OVERVIEW.md` — version 3.0
- `.claude/agents/workflow-builder-agent.md` — Airtable Status Updates + ClickUp Task Rules sections
- `.claude/agents/qa-agent.md` — Airtable Status Updates + ClickUp Task Rules sections
- **n8n workflows updated via API:**
  - `[PA] Onboarding Automation` (7RsRJIqBHFpWZoWM) — 51 nodes
  - `[PA] Status Update Agent` (94DpGwRPWGRPqCVU) — 20 nodes
  - `[PA] ClickUp Sync` (uiTwYIUk6nIFwLtX) — new workflow, 18 nodes
