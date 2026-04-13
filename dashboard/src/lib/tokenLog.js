// Token log reader — fetches briefs/token-log.json from the repo root
// In production (Vercel), this file is served as a static asset from /public/
// In dev, Vite serves it from the public/ folder
//
// Agents write to briefs/token-log.json in the repo root (via terminal).
// To surface on the dashboard, the file is symlinked/copied to dashboard/public/token-log.json
// as part of the build process, or fetched directly via the GitHub raw URL.

const HOURLY_RATE = 50 // assumed $ per hour for comparison

// Fetch the log — tries /token-log.json (public asset), falls back to mock
export async function fetchTokenLog() {
  try {
    const res = await fetch('/token-log.json')
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return data.runs || []
  } catch {
    // Return the seed data as fallback (matches briefs/token-log.json)
    return MOCK_RUNS
  }
}

// Total savings across all runs
export function totalSavings(runs) {
  return runs.reduce((sum, r) => sum + (r.saving_usd || 0), 0)
}

// This week's savings
export function weekSavings(runs) {
  const weekAgo = Date.now() - 7 * 86400000
  return runs
    .filter((r) => new Date(r.ran_at).getTime() > weekAgo)
    .reduce((sum, r) => sum + (r.saving_usd || 0), 0)
}

// This month's savings
export function monthSavings(runs) {
  const now = new Date()
  return runs
    .filter((r) => {
      const d = new Date(r.ran_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((sum, r) => sum + (r.saving_usd || 0), 0)
}

// Savings by agent
export function savingsByAgent(runs) {
  const map = {}
  for (const r of runs) {
    if (!map[r.agent]) map[r.agent] = { agent: r.agent, runs: 0, saving_usd: 0, cost_usd: 0 }
    map[r.agent].runs += 1
    map[r.agent].saving_usd += r.saving_usd || 0
    map[r.agent].cost_usd += r.cost_usd || 0
  }
  return Object.values(map).sort((a, b) => b.saving_usd - a.saving_usd)
}

export function formatUSD(n) {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Mock data (mirrors briefs/token-log.json seed) ──────────────────────────

const MOCK_RUNS = [
  {
    id: 'workflow-builder-agent_2026-04-03T09:15:00Z',
    agent: 'workflow-builder-agent',
    task: 'Built Onboarding Automation workflow for brightline-property-management',
    client_slug: 'brightline-property-management',
    tokens_input: 4200, tokens_output: 3800,
    model: 'claude-sonnet-4-6',
    cost_usd: 0.061, time_saved_minutes: 180, hourly_rate_usd: 50, saving_usd: 149.94,
    ran_at: '2026-04-03T09:15:00Z',
  },
  {
    id: 'proposal-drafting-agent_2026-04-05T11:30:00Z',
    agent: 'proposal-drafting-agent',
    task: "Drafted proposal for Sarah's Wellness Studio",
    client_slug: 'sarahs-wellness-studio',
    tokens_input: 2100, tokens_output: 1900,
    model: 'claude-sonnet-4-6',
    cost_usd: 0.030, time_saved_minutes: 60, hourly_rate_usd: 50, saving_usd: 49.97,
    ran_at: '2026-04-05T11:30:00Z',
  },
  {
    id: 'qa-agent_2026-04-06T14:00:00Z',
    agent: 'qa-agent',
    task: 'QA checklist run for brightline-property-management',
    client_slug: 'brightline-property-management',
    tokens_input: 3500, tokens_output: 2200,
    model: 'claude-sonnet-4-6',
    cost_usd: 0.043, time_saved_minutes: 90, hourly_rate_usd: 50, saving_usd: 74.96,
    ran_at: '2026-04-06T14:00:00Z',
  },
  {
    id: 'process-mapping-agent_2026-04-07T10:00:00Z',
    agent: 'process-mapping-agent',
    task: 'Process map from assessment call — Meridian Consulting Group',
    client_slug: 'meridian-consulting-group',
    tokens_input: 1800, tokens_output: 2400,
    model: 'claude-sonnet-4-6',
    cost_usd: 0.031, time_saved_minutes: 45, hourly_rate_usd: 50, saving_usd: 37.47,
    ran_at: '2026-04-07T10:00:00Z',
  },
  {
    id: 'outreach-agent_2026-04-08T07:05:00Z',
    agent: 'outreach-agent',
    task: 'Personalised outreach sequences for 12 new prospects',
    client_slug: null,
    tokens_input: 5200, tokens_output: 4100,
    model: 'claude-sonnet-4-6',
    cost_usd: 0.069, time_saved_minutes: 120, hourly_rate_usd: 50, saving_usd: 99.93,
    ran_at: '2026-04-08T07:05:00Z',
  },
  {
    id: 'workflow-builder-agent_2026-04-09T09:30:00Z',
    agent: 'workflow-builder-agent',
    task: 'Built Lead Qualification + Status Update workflows for sarahs-wellness-studio',
    client_slug: 'sarahs-wellness-studio',
    tokens_input: 6100, tokens_output: 5200,
    model: 'claude-sonnet-4-6',
    cost_usd: 0.085, time_saved_minutes: 240, hourly_rate_usd: 50, saving_usd: 199.92,
    ran_at: '2026-04-09T09:30:00Z',
  },
  {
    id: 'status-update-agent_2026-04-10T09:00:00Z',
    agent: 'status-update-agent',
    task: 'Weekly status emails to 2 active clients',
    client_slug: null,
    tokens_input: 1200, tokens_output: 1800,
    model: 'claude-sonnet-4-6',
    cost_usd: 0.022, time_saved_minutes: 30, hourly_rate_usd: 50, saving_usd: 24.98,
    ran_at: '2026-04-10T09:00:00Z',
  },
  {
    id: 'proposal-drafting-agent_2026-04-10T14:20:00Z',
    agent: 'proposal-drafting-agent',
    task: 'Drafted proposal for RiverBend Dental',
    client_slug: 'riverbend-dental',
    tokens_input: 2300, tokens_output: 2100,
    model: 'claude-sonnet-4-6',
    cost_usd: 0.032, time_saved_minutes: 60, hourly_rate_usd: 50, saving_usd: 49.97,
    ran_at: '2026-04-10T14:20:00Z',
  },
]
