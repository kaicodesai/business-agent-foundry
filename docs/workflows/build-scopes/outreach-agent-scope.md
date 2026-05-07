# Workflow Build Scope — outreach-agent
Version: 1.1
Last updated: 2026-05-04
For: workflow-builder-agent

---

## Overview

Build an n8n workflow that runs daily, fetches up to 50 pending health/wellness
ICP prospects from Airtable, generates personalised short cold emails + 3-step
follow-up sequences via OpenRouter, sends through the live n8n SMTP nodes,
creates ClickUp outreach tasks, and logs send status back to Airtable.

**Live architecture note (2026-05-04):** Instantly.ai was replaced on 2026-04-21
with direct SMTP (`pa-smtp` / SMTP account 2). OpenRouter `~moonshotai/kimi-latest`
replaced Anthropic API for email generation. All Instantly/Anthropic references
in prior versions of this scope are stale — do not use them.

---

## Trigger

- **Node type:** Schedule Trigger
- **Frequency:** Cron `0 7 * * *` (07:00 daily — 15 minutes after lead-generation-agent)
- **Secondary trigger:** Manual Trigger node for owner-initiated runs

---

## Build Order

### Node 1 — Fetch pending prospects (HTTP Request — Airtable)

**Type:** HTTP Request
**Credential:** `pa-airtable` (`airtableTokenApi`)
**Method:** GET
**URL:**
```
https://api.airtable.com/v0/appMLHig3CN7WW0iW/tbluEsKoQ2p49ktVq
  ?filterByFormula=AND(
    {outreach_status}="pending",
    {email}!="",
    NOT({email_1_sent_at}),
    REGEX_MATCH(LOWER({industry} & " " & {company_name}),
      "health|wellness|clinic|medical|med spa|therapy|chiropractic|
       nutrition|functional medicine|holistic|fertility|yoga|pilates|women")
  )
  &maxRecords=50
```

### Node 2 — Check for pending prospects (IF node)

**Condition:** `{{ ($json.records || []).length > 0 }}`
**False branch:** Exit cleanly (No-Op node)

### Node 3 — Split prospect records (Code node)

**Purpose:** Split the Airtable `records` array into individual n8n items.
Also extracts existing `email_1_text`, `email_2_text`, `email_3_text` from
each record — used by the Switch in Node 4 to skip re-generation on retries.

### Node 4 — Switch: generate or send existing (Switch node)

**Condition:** `{{ $json.email_1_text }}` is not empty
- **Output [0] (generate):** prospect has no email_1_text → proceed to Email Sequence Agent
- **Output [1] (reuse):** prospect already has email_1_text saved (retry case) → skip to Build HTML

### Node 5 — Email Sequence Agent (HTTP Request — OpenRouter)

**Type:** HTTP Request
**Credential:** `OpenRouter account` (`openRouterApi`)
**Method:** POST
**URL:** `https://openrouter.ai/api/v1/chat/completions`
**Body:**
```json
{
  "model": "~moonshotai/kimi-latest",
  "max_tokens": 700,
  "temperature": 0.35,
  "reasoning": { "effort": "none", "exclude": true },
  "messages": [{
    "role": "user",
    "content": "You are Kai Edwards, founder of Phoenix Automation, writing a plain one-to-one cold email. Write like a thoughtful operator, not a marketing sequence. Email BODY ONLY. No HTML, subject lines, links, bullets, feature lists, hype, generic openers, fake compliments, made-up metrics, or made-up client results. Return valid JSON only: {\"email_1\":\"...\",\"email_2\":\"...\",\"email_3\":\"...\"}.\n\nProspect data:\nName: [prospect_name]\nTitle: [job_title]\nCompany: [company_name]\nIndustry: [industry]\nTeam size: [team_size]\n\nCurrent ICP context: health and wellness businesses with 5 to 20 staff in the United States. Relevant pains Kai understands from Fibroid Queen and Soul & Luna work: manual bookings, missed follow up, client onboarding, scheduling, reminders, intake forms, post visit check ins, and keeping a small team from dropping details. Use this context only when it naturally fits the prospect.\n\nFor every email:\n- Sound like a real person wrote it quickly and specifically for their business.\n- 35 to 65 words for email_1, 25 to 50 words for follow ups.\n- Mention exactly one likely operational pain point.\n- Ask exactly one simple question, with exactly one question mark.\n- Do not explain Phoenix Automation unless it is one short natural phrase.\n- Do not mention AI, automation, workflow, CRM, scale, streamline, save time, or efficiency.\n- Do not list services, automations, benefits, or features.\n- Do not start with 'I noticed', 'I hope', 'quick question', 'as a', 'following up', 'just checking', or 'in today's'.\n- Do not use Calendly language in the body.\n- Do not use any dash character. No hyphens, en dashes, em dashes, or hyphenated words like follow-up. Write short plain sentences instead.\n- Keep the tone calm, direct, and lightly conversational.\n\nEmail 1: Start with a specific observation tied to their business type or role, name one pain, ask one question about whether that pain is happening for them.\nEmail 2: Briefly follow up on that same pain from email 1, without saying 'following up'. Ask one lower friction question.\nEmail 3: Last note. Keep it soft and human. Ask one final simple question or offer to leave it there as a question."
  }]
}
```
**Timeout:** 300s
**Note:** `reasoning: { effort: "none", exclude: true }` suppresses chain-of-thought output and keeps the response compact.

### Node 6 — Parse Email Sequence (Code node — runOnceForEachItem)

**Purpose:** Parse OpenRouter JSON response, clean generated bodies before
Airtable/HTML: remove dash/hyphen characters, strip extra question sentences
(enforce exactly one `?`), remove banned AI/workflow terms.

**Key cleaning rules applied:**
- Replace all dash characters (en dash, em dash, hyphens) with spaces
- Strip `AI`, `automation(s)`, `workflow(s)`, `CRM` terms
- `oneQuestionOnly()` — keeps the first sentence ending in `?`, converts subsequent `?` to `.`

### Node 7 — Update Airtable: save email bodies (HTTP Request — Airtable)

**Method:** PATCH
**Purpose:** Save `email_1_text`, `email_2_text`, `email_3_text` to the
prospect record immediately after generation so retries (Node 4 Switch) can
skip re-generation.

**Fields:**
- `email_1_text`: cleaned email 1 body
- `email_2_text`: cleaned email 2 body
- `email_3_text`: cleaned email 3 body

### Node 8 — Build HTML Emails (Code node)

**Purpose:** Wrap cleaned email bodies in the existing Phoenix HTML template.
Do not change the HTML wrapper when copy rules change — only the inner body
text is generated by AI.

**HTML template elements (do not modify):**
- Orange top bar (`#F26A21`)
- Phoenix Automation logo + header
- Signed off as: Kai Edwards, Founder, Phoenix Automation
- Footer: phoenixautomation.ai, LinkedIn, X / @GetPhoenixAI, Tampa Bay Florida
- Email 3 only: includes Calendly booking button

### Node 9 — Lock Prospect: Email 1 Sent (HTTP Request — Airtable)

**Method:** PATCH
**Purpose:** Mark `outreach_status = email_1_sent` before the SMTP send fires,
preventing a second concurrent workflow run from re-queuing the same prospect.
**Fields:** `outreach_status: "email_1_sent"`, `email_1_sent_at: ISO timestamp`
**Note:** ClickUp task ID is NOT written here — it is written by Node 11 after the task is created.

### Node 10 — Send Email 1 (Email Send node)

**Credential:** `pa-smtp` (SMTP account 2 — `kai@phoenixautomation.ai`)
**From:** `Kai Edwards | Phoenix Automation <kai@phoenixautomation.ai>`
**To:** `{{ $json.email }}`
**Subject:** Generated from prospect data (not AI-generated — use a static template
such as `"Quick thought — " + company_name`)
**HTML:** `{{ $json.html_email_1 }}`

### Node 11 — Create ClickUp Outreach Task (HTTP Request — ClickUp)

**Credential:** `pa-clickup`
**List ID:** `901415694346` (Internal / Outreach list)
**Task name:** `Outreach — [company_name]`
**Status:** `Email 1 Sent`

### Node 12 — Update Status: Email 1 Sent (HTTP Request — Airtable)

**Method:** PATCH
**Fields:**
- `outreach_status`: `email_1_sent`
- `email_1_sent_at`: ISO 8601 timestamp
- `clickup_outreach_task_id`: ClickUp task ID from Node 11

---

## Follow-up Sequence

The workflow also runs follow-up branches from the same daily trigger.
Each branch is independent — the trigger fires all three (initial, F1, F2) in
parallel on every run.

### Follow-up 1 (Email 2)

**Fetch filter:**
```
AND(
  {outreach_status}="email_1_sent",
  {email}!="",
  {email_2_text}!="",
  IS_BEFORE({email_1_sent_at}, DATEADD(NOW(),-1,"days")),
  REGEX_MATCH(LOWER({industry} & " " & {company_name}), "health|wellness|...")
)
```
**Wait:** Email 1 must be > 1 day old (sends on Day 2)
**Send:** Email 2 via `pa-smtp`, update ClickUp status to `Email 2 Sent`, update Airtable to `email_2_sent`

### Follow-up 2 (Email 3)

**Fetch filter:**
```
AND(
  {outreach_status}="email_2_sent",
  {email}!="",
  {email_3_text}!="",
  IS_BEFORE({email_2_sent_at}, DATEADD(NOW(),-2,"days")),
  REGEX_MATCH(...)
)
```
**Wait:** Email 2 must be > 2 days old (sends on Day 4 from Email 1)
**Send:** Email 3 via `pa-smtp`, update ClickUp to `Email 3 Sent`, update Airtable to `email_3_sent`

### Sequence Completion

After Email 3 is sent, a fourth branch fetches `email_3_sent` records and marks
them `completed` in Airtable + ClickUp once a configurable grace period passes.

---

## Reply Detection

**Trigger:** Gmail API search (`Search Gmail Replies` node) fires on the same daily cron using `Gmail account 2`.
**Flow:** Normalize Gmail replies -> Filter real replies (remove auto-responders/bounce) -> Loop -> Lookup
prospect by email in Airtable → If match: update `outreach_status = replied`,
update ClickUp to `Replied`, email Kai at `kai@phoenixautomation.ai`.

Owner handles all replies manually. The workflow does not respond to prospect replies.

---

## Error Handling

- Per-prospect failures in email generation: `continueOnFail = true` on Parse
  Email Sequence to prevent one bad record from killing the whole batch
- SMTP send failure: non-blocking; prospect status remains `email_1_sent` (locked
  by Node 9) — owner must manually inspect and re-queue
- ClickUp task creation failure: non-blocking; `clickup_outreach_task_id` stays
  blank in Airtable

---

## Known Issues (as of 2026-05-04)

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Schedule trigger has no fixed time | Schedule Trigger node (uses `hoursInterval: 24` not cron) | Execution time drifts daily, could run before Lead Generation | Change to cron `0 7 * * *` |

---

## Credentials

| Credential name | Type | Used by |
|----------------|------|---------|
| `pa-airtable` (`airtableTokenApi`) | Airtable PAT | Nodes 1, 7, 9, 12, follow-up fetches, reply lookup |
| `OpenRouter account` (`openRouterApi`) | OpenRouter API | Node 5 |
| `pa-smtp` (SMTP account 2) | SMTP | Nodes 10, follow-up sends, Kai notification |
| `pa-clickup` (`clickupApi`) | ClickUp API | Nodes 11, follow-up ClickUp updates |

---

## Test Data

Add one test prospect to Airtable with `outreach_status = pending`:
```
prospect_name: Test Owner
company_name: Sunrise Wellness Clinic
industry: health and wellness
job_title: Practice Owner
team_size: 8
email: [owner test email address]
```

Expected test output:
- Email Sequence Agent generates 3 personalised emails referencing health/wellness pain points
- Email 1 sent via `pa-smtp` to owner's test email
- Phoenix HTML wrapper renders correctly (orange bar, logo, Kai Edwards signature)
- ClickUp Outreach task created in Internal / Outreach list
- Airtable `outreach_status` updated to `email_1_sent`
- `email_1_text`, `email_2_text`, `email_3_text` saved to Airtable record

After test: update Airtable test record `outreach_status = test-complete`
so follow-up branches do not process it.

---

## Expected Output (production)

Each daily run processes up to 50 pending health/wellness ICP prospects:
1. Email 1 sent and follow-up bodies saved per prospect
2. ClickUp Outreach task created per prospect
3. Airtable `outreach_status = email_1_sent` for all processed records
4. Follow-up emails sent to eligible email_1_sent / email_2_sent records
5. Replies detected and owner notified
