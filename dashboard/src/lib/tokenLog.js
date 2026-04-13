// Token savings tracker — Pro subscription vs API credit model
//
// Concept: You run Claude Code on a Claude Pro subscription (flat $20/month).
// Without Pro, every terminal session would cost API credits at standard pricing:
//   claude-sonnet-4-6: $3.00/MTok input, $15.00/MTok output
//
// Savings = API-equivalent cost of all sessions - Pro subscription cost (amortized)
//
// The log is written manually after each session by reading the token count
// Claude Code shows at the end. Stored in briefs/token-log.json, served as
// a static asset from dashboard/public/token-log.json.

const PRICING = {
  input_per_mtok:  3.00,   // $ per million input tokens (claude-sonnet-4-6)
  output_per_mtok: 15.00,  // $ per million output tokens
}

const PRO_MONTHLY = 20.00  // Claude Pro flat monthly cost

// ── Fetch ─────────────────────────────────────────────────────────────────

export async function fetchTokenLog() {
  try {
    const res = await fetch('/token-log.json')
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return {
      sessions: data.sessions || [],
      subscription: data.subscription || { monthly_cost_usd: PRO_MONTHLY },
      pricing: data._pricing || PRICING,
    }
  } catch {
    return { sessions: MOCK_SESSIONS, subscription: { monthly_cost_usd: PRO_MONTHLY }, pricing: PRICING }
  }
}

// ── Calculations ──────────────────────────────────────────────────────────

// API-equivalent cost for a single session
export function sessionApiCost(session) {
  if (session.api_equivalent_usd != null) return session.api_equivalent_usd
  const inputCost  = (session.tokens_input  / 1_000_000) * PRICING.input_per_mtok
  const outputCost = (session.tokens_output / 1_000_000) * PRICING.output_per_mtok
  return inputCost + outputCost
}

// Sessions in the current calendar month
export function sessionsThisMonth(sessions) {
  const now = new Date()
  return sessions.filter((s) => {
    const d = new Date(s.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
}

// Sessions in the last 7 days
export function sessionsThisWeek(sessions) {
  const weekAgo = Date.now() - 7 * 86400000
  return sessions.filter((s) => new Date(s.date).getTime() > weekAgo)
}

// Total API-equivalent cost across a set of sessions
export function totalApiEquivalent(sessions) {
  return sessions.reduce((sum, s) => sum + sessionApiCost(s), 0)
}

// Total tokens across sessions
export function totalTokens(sessions) {
  return sessions.reduce(
    (acc, s) => ({
      input:  acc.input  + (s.tokens_input  || 0),
      output: acc.output + (s.tokens_output || 0),
    }),
    { input: 0, output: 0 }
  )
}

// Pro cost amortized to match the date range of given sessions
// If sessions span < 1 month, pro cost = (days spanned / 30) × monthly_cost
export function proRateCost(sessions, monthlyUsd = PRO_MONTHLY) {
  if (!sessions.length) return monthlyUsd
  const dates = sessions.map((s) => new Date(s.date).getTime())
  const spanDays = Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1
  // Cap at 30 days (one billing cycle)
  return Math.min(spanDays / 30, 1) * monthlyUsd
}

// Net savings = API equivalent - Pro subscription cost (for the same period)
export function netSavings(sessions, monthlyUsd = PRO_MONTHLY) {
  const apiCost = totalApiEquivalent(sessions)
  const proCost = proRateCost(sessions, monthlyUsd)
  return apiCost - proCost
}

// Monthly savings: this month's API equivalent - full month Pro cost
export function monthlySavings(sessions, monthlyUsd = PRO_MONTHLY) {
  const monthly = sessionsThisMonth(sessions)
  return totalApiEquivalent(monthly) - monthlyUsd
}

export function formatUSD(n) {
  const abs = Math.abs(n)
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-$${str}` : `$${str}`
}

export function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

// ── Mock data (mirrors briefs/token-log.json) ─────────────────────────────

const MOCK_SESSIONS = [
  {
    id: 'session_2026-04-01_onboarding-build',
    date: '2026-04-01',
    task: 'Built Onboarding Automation — 51 nodes, ClickUp seeding, dual welcome emails',
    tokens_input: 142000, tokens_output: 38000,
    model: 'claude-sonnet-4-6', api_equivalent_usd: 0.996,
  },
  {
    id: 'session_2026-04-03_scoping-workflows',
    date: '2026-04-03',
    task: 'Built Scoping Agent, Scope Approval, Workflow Builder Agent',
    tokens_input: 218000, tokens_output: 61000,
    model: 'claude-sonnet-4-6', api_equivalent_usd: 1.569,
  },
  {
    id: 'session_2026-04-05_proposal-outreach',
    date: '2026-04-05',
    task: 'Drafted proposals for 2 leads + personalised outreach sequences',
    tokens_input: 89000, tokens_output: 34000,
    model: 'claude-sonnet-4-6', api_equivalent_usd: 0.777,
  },
  {
    id: 'session_2026-04-07_process-mapping',
    date: '2026-04-07',
    task: 'Process map from Meridian Consulting assessment call + scope of work',
    tokens_input: 74000, tokens_output: 28000,
    model: 'claude-sonnet-4-6', api_equivalent_usd: 0.642,
  },
  {
    id: 'session_2026-04-08_lead-gen-fix',
    date: '2026-04-08',
    task: 'Fixed Lead Generation — Hunter.io + Tavily live search integration',
    tokens_input: 163000, tokens_output: 44000,
    model: 'claude-sonnet-4-6', api_equivalent_usd: 1.149,
  },
  {
    id: 'session_2026-04-10_chatbot-live',
    date: '2026-04-10',
    task: 'Website Chatbot — full pipeline operational, E2E tested, live',
    tokens_input: 198000, tokens_output: 52000,
    model: 'claude-sonnet-4-6', api_equivalent_usd: 1.374,
  },
  {
    id: 'session_2026-04-13_dashboard-build',
    date: '2026-04-13',
    task: 'Built full KAI OS dashboard — light UI redesign, Vercel deploy, Financials',
    tokens_input: 412000, tokens_output: 118000,
    model: 'claude-sonnet-4-6', api_equivalent_usd: 3.006,
  },
]
