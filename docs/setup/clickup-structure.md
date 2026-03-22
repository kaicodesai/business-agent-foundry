# ClickUp Structure — Phoenix Automation
**Version:** 1.2
**Last updated:** 2026-03-22
**Team ID:** `90141018999`
**Space ID:** `90144568071`
**Space Name:** Phoenix Automation
**Status:** ✅ Implemented and end-to-end tested — onboarding automation creates folder+4-lists at space level

> This document defines the ClickUp structure for Phoenix Automation.
> Client folders are created at **space level** (not nested inside [PA] Client Projects) due to ClickUp API v2 not supporting nested folders.

---

## Full Space Structure

```
Space: Phoenix Automation (90144568071)
│
├── Folder: [PA] Client Projects     ← manually managed reference folder (not used by automation)
├── Folder: Internal
│   ├── List: Lead Management
│   └── List: Operations
│
└── Folder: [client-slug]            ← one created per client by onboarding automation (space level)
    ├── List: Onboarding
    ├── List: Build
    ├── List: QA
    └── List: Live
```

> **Note:** The original design placed client folders inside `[PA] Client Projects`, but ClickUp API v2 does not support nested folders (`POST /api/v2/folder/{folder_id}/folder` returns 404). Client folders are created at space level instead using `POST /api/v2/space/90144568071/folder`.

---

## Section 1 — Client Folders

### Per-Client Folder

**Format:** `[client-slug]` (e.g. `meridian-consulting-group`)
**Created by:** [PA] Onboarding Automation — n8n workflow `Ro9IkQBlNaUxKR6B`
**Created when:** Payment webhook fires and payload validates
**API endpoint:** `POST /api/v2/space/90144568071/folder`

**As-built behaviour:**
- Onboarding automation creates a **folder** named `[client-slug]` at space level
- Creates **4 lists** inside that folder: `Onboarding`, `Build`, `QA`, `Live`
- Stores the **folder ID** in Airtable `clickup_folder_id`
- End-to-end tested 2026-03-22 — folder and 4 lists confirmed created in ClickUp

---

### List: Onboarding

**Purpose:** Track the setup steps between payment and build-ready.
**Created by:** [PA] Onboarding Automation
**Pre-populated tasks:** Yes — onboarding automation creates all tasks on list creation.

| # | Task Name | Description | Owner | Depends On | Created By |
|---|-----------|-------------|-------|------------|------------|
| 1 | Welcome email sent to client | Onboarding automation has sent the client welcome email with ClickUp invite | Agent | — | [PA] Onboarding Automation |
| 2 | Internal summary email sent to Kai | Onboarding automation has sent Kai the new client summary | Agent | — | [PA] Onboarding Automation |
| 3 | Airtable record updated | Client record created/updated in Airtable with workspace name, ClickUp ID, credentials checklist | Agent | — | [PA] Onboarding Automation |
| 4 | Credential setup instructions sent to client | Kai emails client with instructions on which tools to connect in n8n and how | Kai | Task 1 | Kai |
| 5 | Client connects all tools in n8n | Client logs into each required tool and authorises n8n credential nodes | Client | Task 4 | — |
| 6 | All credentials tested green | Kai opens each credential node in n8n and confirms green (authenticated) | Kai | Task 5 | — |
| 7 | Compliance flags cleared | All ⚠️ COMPLIANCE FLAG items from process-map.md are resolved or descoped | Kai | — | — |
| 8 | Scope finalised with client | Client has confirmed no changes to agreed scope | Kai | — | — |
| 9 | Onboarding complete — build ready | Kai confirms all 12 readiness conditions (see onboarding-readiness-spec.md) | Kai | Tasks 6, 7, 8 | — |

**Custom fields on each task:** None required at launch. Status field (Open → In Progress → Complete) is sufficient.

---

### List: Build

**Purpose:** Track the workflow build for this client.
**Created by:** [PA] Onboarding Automation (list created), then populated by Haris/workflow-builder-agent during build.

| # | Task Name | Description | Owner | Depends On | Created/Updated By |
|---|-----------|-------------|-------|------------|--------------------|
| 1 | Build started | Owner has triggered workflow-builder-agent with scope-of-work.md | Haris | Onboarding List: Task 9 complete | Haris |
| 2 | [Workflow name] — built and tested | One task per workflow in scope-of-work.md. Name matches exact workflow name e.g. `Lead Response Automation — built and tested` | Haris | Task 1 | workflow-builder-agent |
| 3 | Error handling configured | Every workflow has error handling nodes — either catch + notify or documented reason why not needed | Haris | Task 2(s) | Haris |
| 4 | Build log written | `docs/clients/[slug]/build-log.md` exists with entry per workflow, all at status `Built and tested — awaiting owner review` | Agent | Task 3 | workflow-builder-agent |
| 5 | Owner review requested | Kai has been notified that build is complete and build log is ready for review | Haris | Task 4 | Haris |

> **Note:** Task 2 is templated — one task per workflow in scope. If scope includes 3 automations, there will be 3 separate "built and tested" tasks. Haris creates these at build start based on scope-of-work.md.

---

### List: QA

**Purpose:** Track QA execution and sign-off.
**Created by:** [PA] Onboarding Automation (list created empty), populated by Haris during QA.

| # | Task Name | Description | Owner | Depends On | Created/Updated By |
|---|-----------|-------------|-------|------------|--------------------|
| 1 | QA checklist run | Haris/qa-agent runs the full 25-item checklist against all workflows | Haris | Build List: Task 5 | Haris |
| 2 | QA report written | `docs/clients/[slug]/qa-report.md` exists with verdict and all 25 items | Agent | Task 1 | qa-agent |
| 3 | QA verdict: PASS / CONDITIONAL PASS / FAIL | Outcome recorded. If FAIL: return to Build list. | Haris | Task 2 | Haris |
| 4 | Conditional fixes verified (if applicable) | If QA CONDITIONAL PASS: Kai confirms each conditional fix is done before activating | Kai | Task 3 | Kai |
| 5 | Owner activation checklist reviewed | Kai has read qa-report.md in full and completed the activation checklist | Kai | Task 4 | Kai |

---

### List: Live

**Purpose:** Track activation and ongoing client health.
**Created by:** [PA] Onboarding Automation (list created empty), populated by Kai on activation day.

| # | Task Name | Description | Owner | Depends On | Created/Updated By |
|---|-----------|-------------|-------|------------|--------------------|
| 1 | Workflows activated in n8n | Kai manually activates all client workflows in n8n | Kai | QA List: Task 5 | Kai |
| 2 | Airtable `project_status` set to `live` | Kai updates Airtable — triggers status-update-agent on next Monday cron | Kai | Task 1 | Kai |
| 3 | `project_launch_date` recorded in Airtable | Kai sets the launch date field — referral-trigger-agent counts from this | Kai | Task 1 | Kai |
| 4 | Client notified — project is live | Kai sends client a live notification (email or call) | Kai | Task 1 | Kai |
| 5 | Status update agent confirmed running | First automated Monday status email sent and delivered | Agent | Task 2 | [PA] Status Update Agent |
| 6 | Test records cleaned up | Any test data (e.g. Meridian Consulting Group, Status Test Client) removed from Airtable and ClickUp | Kai/Haris | Task 1 | Kai/Haris |
| 7 | `n8n_workflow_ids` added to Airtable | Kai adds the live workflow IDs to the client's Airtable record — required for reporting-agent | Kai | Task 1 | Kai |

---

## Section 2 — Internal Folder

### List: Lead Management

**Purpose:** Weekly operational checklist for managing the acquisition pipeline.
**Created by:** Kai (manually, once, at structure setup).
**Tasks are recurring — they reset weekly, not per-client.**

| # | Task Name | Description | Owner | Cadence |
|---|-----------|-------------|-------|---------|
| 1 | Review lead gen results | Check `automation_logs` table in Airtable — how many prospects added this week? Any errors? | Kai | Weekly (Monday) |
| 2 | Review inbound scored leads | Check Prospects table for any new `outreach_status = replied` or Typeform submissions scored HIGH | Kai | Weekly |
| 3 | Proposals pending send | Review any `proposal-draft.md` files waiting for owner review and sending | Kai | Weekly |
| 4 | Follow-ups to action | Review Instantly.ai for replies needing manual response from Kai | Kai | Weekly |
| 5 | Assessment calls this week | Check Calendly for booked calls and confirm pre-call briefs are ready | Kai | Weekly |

---

### List: Operations

**Purpose:** Internal build and system health tasks.
**Created by:** Kai (manually, once, at structure setup).

| # | Task Name | Description | Owner | Cadence |
|---|-----------|-------------|-------|---------|
| 1 | Check QA queue | Are there any client builds waiting for QA? Check build-log.md files | Haris | Weekly |
| 2 | Workflow builds in progress | Status check on any active client builds — blockers? ETA? | Haris | Weekly |
| 3 | System credential check | Confirm all pa- credentials in n8n are still active (not expired) | Kai | Monthly |
| 4 | Test record cleanup | Remove any test Airtable/ClickUp records before a real client is onboarded | Kai/Haris | As needed |
| 5 | GitHub branch hygiene | Merge completed feature branches, delete stale branches | Haris | Monthly |
| 6 | Error log review | Check n8n execution logs for any failed runs across all [PA] workflows | Haris | Weekly |

---

## Section 3 — What Onboarding Automation Creates

### Current behaviour (as-built)
- Creates **one folderless list** at space level
- List name: `[PA] [company_name]` (e.g. `[PA] Meridian Consulting Group`)
- No tasks pre-populated
- Writes the ClickUp list ID to Airtable `clickup_project_id`

### Target behaviour (this blueprint)
- Creates a **folder** named `[client-slug]` inside the existing `[PA] Client Projects` folder
- Creates **4 lists** inside that folder: `Onboarding`, `Build`, `QA`, `Live`
- Pre-populates the **Onboarding list** with Tasks 1–3 as auto-completed (agent-verified) and Tasks 4–9 as open (owner action required)
- Writes the **Onboarding list ID** to Airtable `clickup_project_id` (primary reference)
- status-update-agent reads `clickup_project_id` to fetch tasks — it should read from all 4 lists, not just Onboarding

### Changes required to onboarding automation to implement target behaviour

| Change | Node | What to change |
|--------|------|---------------|
| Create client folder | New node after node 12 | `POST /api/v2/folder/{folderless_list_folder_id}/list` → `POST /api/v2/folder/{client_projects_folder_id}/folder` to create `[client-slug]` folder |
| Create 4 lists | 4 new nodes | `POST /api/v2/folder/{new_client_folder_id}/list` × 4 (Onboarding, Build, QA, Live) |
| Pre-populate Onboarding tasks | Additional nodes | `POST /api/v2/list/{onboarding_list_id}/task` × 3 for auto-completed agent tasks |
| Update Airtable field | Node 15 | Store primary list ID (Onboarding list) in `clickup_project_id` |

> **Decision for Kai:** This is a meaningful change to the onboarding automation. Recommend doing it before the first real client, not during. Estimated build time: 30–45 minutes with workflow-builder-agent. The existing workflow (ID: `Ro9IkQBlNaUxKR6B`) would be modified in place.

---

## Section 4 — status-update-agent and ClickUp

The status-update-agent (workflow ID: `VhqfzN6afzpNDTu1`) currently:
- Reads `clickup_project_id` from Airtable
- Fetches tasks from that single list via `GET /api/v2/list/{id}/task?include_closed=true`
- Categorises tasks as completed / in_progress / blocked

**With the new structure**, the agent should fetch tasks from all 4 lists (Onboarding, Build, QA, Live) to give the client a complete picture. This requires either:
- Storing all 4 list IDs in Airtable (e.g. `clickup_onboarding_list_id`, `clickup_build_list_id` etc.), or
- Using the folder ID and listing all lists within it via `GET /api/v2/folder/{id}/list`

> **Decision for Kai:** Recommendation is to store the **folder ID** in `clickup_project_id` (not the list ID) and update status-update-agent to list all folder lists, then fetch tasks from each. This is cleaner than storing 4 separate IDs.

---

## Implementation Order

| Step | What | Who | When |
|------|------|-----|------|
| 1 | Create `[PA] Client Projects` folder manually in ClickUp | Kai | Now |
| 2 | Create `Internal` folder manually in ClickUp | Kai | Now |
| 3 | Create `Lead Management` and `Operations` lists manually | Kai | Now |
| 4 | Add all tasks to Lead Management and Operations lists | Kai | Now |
| 5 | Update onboarding automation to create folders + 4 lists | Haris (via workflow-builder-agent) | Before first real client |
| 6 | Update status-update-agent to read from folder (not single list) | Haris | After step 5 |
| 7 | Record new folder/list IDs in PROJECT_OVERVIEW.md | Kai/Haris | After step 1–2 |

---

## Decisions Summary

| # | Decision | Resolution |
|---|---------|-----------|
| 1 | Switch onboarding automation from folderless lists to folder+4-lists structure? | ✅ **DONE 2026-03-22** — Ro9IkQBlNaUxKR6B updated to 24 nodes |
| 2 | Update status-update-agent to read from folder (not single list ID)? | ✅ **DONE 2026-03-22** — VhqfzN6afzpNDTu1 updated, reads all folder tasks via team API |
| 3 | Store folder ID or Onboarding list ID in Airtable `clickup_project_id`? | ✅ **Folder ID stored** — field renamed to `clickup_folder_id` (fld9PdwZetXwjENmb) |
| 4 | Pre-populate Build, QA, and Live lists with template tasks at onboarding time? | **No (for now)** — only Onboarding tasks pre-populated. Build/QA/Live tasks added by Haris during those phases |
| 5 | Create Internal folder and lists now (manually) before onboarding automation is updated? | ✅ **DONE 2026-03-20** — Internal folder (90147969240), Lead Management (901414699479), Operations (901414699480) created |
