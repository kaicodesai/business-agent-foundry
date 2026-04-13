import { useState } from 'react'
import TopBar from '../components/TopBar'

const MOCK_BRIEFS = [
  {
    id: 'b1',
    title: 'Lead Generation Agent Brief',
    date: '2026-04-10',
    tokens_saved: 1840,
    content: `# Lead Generation Agent Brief

## Objective
Source 30–50 new ICP-matched prospects per day from Hunter.io and Tavily live web search.

## ICP Criteria
- Job titles: Owner, Founder, Director, CEO
- Team size: 5–50 employees
- Industries: Professional Services, Trades, Healthcare, Retail

## Workflow
1. Tavily Search runs 3 real-time Google searches per run
2. GPT-4o-mini extracts ICP company domains from live results
3. Hunter.io domain-search finds email addresses
4. Normalize Leads filters to ICP titles and skips no-name/no-title contacts
5. Write to Airtable Prospects table with source = 'hunter'

## Output
Each run adds ~30–50 new prospect records to Airtable with outreach_status = pending.

## Known Issues
- Duplicate checking relies on email deduplication
- Apollo.io replaced with Hunter.io (April 2026)
`,
  },
  {
    id: 'b2',
    title: 'Website Chatbot Brief',
    date: '2026-04-10',
    tokens_saved: 2100,
    content: `# Website Chatbot Brief

## Objective
Convert website visitors into qualified leads via a 3-question chatbot on phoenixautomation.ai.

## Flow
1. User opens chat (auto-popup at 13s)
2. Bot asks: business size → biggest pain → timeline/budget signal
3. Claude scores lead: hot / borderline / cold
4. Hot → write Airtable Prospect + return Calendly link
5. Cold → return nurture message
6. Borderline → ask clarifying question

## Live Configuration
- Webhook: POST /website-chatbot
- Airtable fields written: biggest_operational_pain, lead_score_grade, lead_source
- Calendly URL: https://calendly.com/phoenixautomation/assessment

## E2E Test Result
✅ PASS — 2026-04-10 — record recRypnI7vsMlisJR created in Airtable Prospects
`,
  },
  {
    id: 'b3',
    title: 'Onboarding Automation Brief',
    date: '2026-03-27',
    tokens_saved: 3200,
    content: `# Onboarding Automation Brief

## Objective
Fully automated client onboarding on payment confirmation — zero manual steps.

## Trigger
POST /payment-confirmed webhook

## Steps
1. Create ClickUp folder + 4 lists (Onboarding, Build, QA, Live)
2. Seed 23 tasks across all lists
3. Write Airtable Clients record
4. Send welcome email to client (includes n8n setup instructions)
5. Send internal summary to Kai
6. Write all clickup_task_* IDs back to Airtable

## Email Template
Subject: "Welcome to Phoenix Automation — action required before we can start"
Includes: n8n account setup steps (sign up → create API key → reply with instance URL + key)

## Test Record
✅ brightline-property-management — 2026-03-25
`,
  },
]

export default function Briefs() {
  const [selected, setSelected] = useState(MOCK_BRIEFS[0])

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Briefs" />
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — brief list */}
        <aside className="w-64 border-r border-border bg-surface flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
              {MOCK_BRIEFS.length} briefs
            </p>
          </div>
          <ul className="flex-1">
            {MOCK_BRIEFS.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setSelected(b)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                    selected?.id === b.id
                      ? 'border-l-4 border-l-primary text-primary bg-primary-hover'
                      : 'border-l-4 border-l-transparent text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium leading-tight">{b.title}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{b.date}</p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right panel — content */}
        <main className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="card p-6 max-w-3xl">
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
                <div>
                  <h2 className="font-heading font-bold text-text-primary text-xl">{selected.title}</h2>
                  <p className="text-text-muted text-sm mt-1">{selected.date}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs text-text-muted">Tokens saved</p>
                  <p className="font-mono font-medium text-navy text-sm">{selected.tokens_saved.toLocaleString()}</p>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="font-sans text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-text-muted">
              Select a brief to read
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
