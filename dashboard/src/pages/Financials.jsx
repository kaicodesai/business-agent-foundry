import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import { fetchClients } from '../lib/airtable'
import {
  fetchTokenLog,
  totalApiEquivalent,
  sessionsThisMonth,
  sessionsThisWeek,
  totalTokens,
  netSavings,
  monthlySavings,
  formatUSD,
  formatTokens,
  sessionApiCost,
} from '../lib/tokenLog'

// ── Service tier pricing ──────────────────────────────────────────────────────
const TIER_VALUE = {
  'starter-build':   1500,
  'growth-build':    3500,
  'scale-build':     6500,
  'retainer':        1200,
  'agency-retainer': 2500,
}

const ACTIVE_STATUSES = new Set([
  'onboarding', 'onboarding.in_progress', 'build.ready', 'building',
  'build_review', 'qa.in_progress', 'qa.pass', 'live',
])

const PIPELINE_STATUSES = new Set([
  'new_lead', 'qualified', 'call_complete', 'scoping', 'scope_review',
])

const STAGE_PROBABILITY = {
  new_lead: 0.10, qualified: 0.25, call_complete: 0.45,
  scoping: 0.65, scope_review: 0.80,
}

const AVG_DEAL_VALUE = 3000

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, valueColor }) {
  return (
    <div className={`bg-surface border rounded-card shadow-card p-5 flex flex-col gap-1 ${
      accent ? 'border-l-4 border-l-primary border-t border-r border-b border-border' : 'border border-border'
    }`}>
      <span className={`text-2xl font-heading font-bold ${valueColor || 'text-navy'}`}>{value}</span>
      <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</span>
      {sub && <span className="text-xs text-text-secondary mt-0.5">{sub}</span>}
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-3">
      <h2 className="font-heading font-semibold text-text-primary text-sm">{title}</h2>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function SheetsPlaceholder() {
  return (
    <div className="card p-6 border-dashed border-2 border-border flex flex-col items-center justify-center text-center gap-3 min-h-[180px]">
      <div className="w-10 h-10 rounded-full bg-primary-hover flex items-center justify-center">
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">Howard's Google Sheet</p>
        <p className="text-xs text-text-muted mt-1">Income & expense tracking — connect your sheet to show P&L here</p>
      </div>
      <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs font-mono text-text-secondary border border-border">
        Add VITE_GOOGLE_SHEETS_ID to Vercel env vars
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Financials() {
  const [clients, setClients]     = useState([])
  const [tokenData, setTokenData] = useState({ sessions: [], subscription: { monthly_cost_usd: 20 } })
  const [loading, setLoading]     = useState(true)

  const load = async () => {
    setLoading(true)
    const [c, tl] = await Promise.all([fetchClients(), fetchTokenLog()])
    setClients(c)
    setTokenData(tl)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Revenue ─────────────────────────────────────────────────────────────────

  const confirmedClients = clients.filter((c) =>
    ACTIVE_STATUSES.has(c.fields?.project_status) || c.fields?.project_status === 'test-complete'
  )
  const pipelineClients = clients.filter((c) => PIPELINE_STATUSES.has(c.fields?.project_status))

  const confirmedRevenue = confirmedClients.reduce((sum, c) => {
    const val = c.fields?.proposal_value || TIER_VALUE[c.fields?.service_tier] || AVG_DEAL_VALUE
    return sum + val
  }, 0)

  const pipelineRevenue = pipelineClients.reduce((sum, c) => {
    const prob = STAGE_PROBABILITY[c.fields?.project_status] || 0.1
    const val  = c.fields?.proposal_value || AVG_DEAL_VALUE
    return sum + val * prob
  }, 0)

  const retainerClients = confirmedClients.filter((c) =>
    ['retainer', 'agency-retainer'].includes(c.fields?.service_tier)
  )
  const mrr = retainerClients.reduce((sum, c) => sum + (TIER_VALUE[c.fields?.service_tier] || 0), 0)

  // ── Token savings (Pro vs API) ───────────────────────────────────────────────

  const { sessions, subscription } = tokenData
  const proMonthly    = subscription.monthly_cost_usd || 20
  const proDaily      = proMonthly / 30

  const allApiEquiv   = totalApiEquivalent(sessions)
  const monthSessions = sessionsThisMonth(sessions)
  const weekSessions  = sessionsThisWeek(sessions)

  const monthApiEquiv = totalApiEquivalent(monthSessions)
  const weekApiEquiv  = totalApiEquivalent(weekSessions)

  const allTimeSavings   = netSavings(sessions, proMonthly)
  const thisMonthSavings = monthlySavings(sessions, proMonthly)

  const allTokens   = totalTokens(sessions)
  const monthTokens = totalTokens(monthSessions)

  // Days in current month so far
  const dayOfMonth = new Date().getDate()
  const proSpentSoFar = proDaily * dayOfMonth

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Financials" onRefresh={load} />
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>

            {/* ── Revenue ── */}
            <section>
              <SectionHeader
                title="Revenue"
                sub="Confirmed = active/live clients. Pipeline = weighted by conversion probability per stage."
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard accent label="Confirmed Revenue"    value={formatUSD(confirmedRevenue)} sub={`${confirmedClients.length} clients`} />
                <StatCard accent label="Pipeline (Weighted)"  value={formatUSD(pipelineRevenue)} sub={`${pipelineClients.length} leads`} />
                <StatCard        label="MRR (Retainers)"      value={mrr > 0 ? formatUSD(mrr) : '—'} sub={`${retainerClients.length} retainer clients`} />
                <StatCard        label="Total Potential"       value={formatUSD(confirmedRevenue + pipelineRevenue)} sub="Confirmed + pipeline" />
              </div>
            </section>

            {/* ── Client revenue breakdown ── */}
            <section>
              <SectionHeader title="Client Revenue Breakdown" />
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      {['Client', 'Status', 'Tier', 'Value', 'Type'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...confirmedClients, ...pipelineClients].map((c) => {
                      const isConfirmed = ACTIVE_STATUSES.has(c.fields?.project_status)
                      const tier = c.fields?.service_tier
                      const val  = c.fields?.proposal_value || TIER_VALUE[tier] || AVG_DEAL_VALUE
                      const prob = STAGE_PROBABILITY[c.fields?.project_status]
                      return (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-primary-hover/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-text-primary">{c.fields?.company_name}</td>
                          <td className="px-4 py-3"><span className={isConfirmed ? 'badge-active' : 'badge-gray'}>{c.fields?.project_status}</span></td>
                          <td className="px-4 py-3 text-text-secondary capitalize">{tier || '—'}</td>
                          <td className="px-4 py-3 font-mono font-medium text-navy">
                            {formatUSD(isConfirmed ? val : val * (prob || 0.1))}
                            {!isConfirmed && <span className="text-text-muted font-sans font-normal text-xs ml-1">({Math.round((prob || 0.1) * 100)}%)</span>}
                          </td>
                          <td className="px-4 py-3 text-text-muted text-xs">{isConfirmed ? 'Confirmed' : 'Pipeline'}</td>
                        </tr>
                      )
                    })}
                    {confirmedClients.length === 0 && pipelineClients.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-text-muted text-sm">No clients yet — mock data shown on dashboard</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Income & Expenses ── */}
            <section>
              <SectionHeader title="Income & Expenses" sub="Howard's tracking sheet — connect Google Sheets to show monthly P&L" />
              <SheetsPlaceholder />
            </section>

            {/* ── Claude Pro vs API Credits ── */}
            <section>
              <SectionHeader
                title="Claude Pro Savings"
                sub={`You're on Claude Pro ($${proMonthly}/mo flat). This tracks what you would have paid at standard API rates ($3/MTok input · $15/MTok output) — the difference is your monthly savings.`}
              />

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <StatCard
                  accent
                  label="API Equivalent (All Time)"
                  value={formatUSD(allApiEquiv)}
                  sub="What API billing would have cost"
                />
                <StatCard
                  accent
                  label={`API Equiv (${new Date().toLocaleString('en-US', { month: 'short' })})`}
                  value={formatUSD(monthApiEquiv)}
                  sub={`vs $${proSpentSoFar.toFixed(2)} Pro cost so far`}
                />
                <StatCard
                  label="This Month Savings"
                  value={formatUSD(thisMonthSavings)}
                  valueColor={thisMonthSavings >= 0 ? 'text-success' : 'text-error'}
                  sub={thisMonthSavings >= 0 ? 'Ahead of Pro cost' : 'Pro cost not yet covered'}
                />
                <StatCard
                  label="Tokens This Month"
                  value={formatTokens(monthTokens.input + monthTokens.output)}
                  sub={`${formatTokens(monthTokens.input)} in · ${formatTokens(monthTokens.output)} out`}
                />
              </div>

              {/* Pro vs API comparison bar */}
              <div className="card p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {new Date().toLocaleString('en-US', { month: 'long' })} — Pro vs API
                  </span>
                  <span className={`text-sm font-semibold ${monthApiEquiv >= proSpentSoFar ? 'text-success' : 'text-warning'}`}>
                    {monthApiEquiv >= proSpentSoFar
                      ? `${formatUSD(monthApiEquiv - proSpentSoFar)} saved so far`
                      : `${formatUSD(proSpentSoFar - monthApiEquiv)} more usage needed to break even`}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>API-equivalent cost</span>
                      <span className="font-mono">{formatUSD(monthApiEquiv)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min((monthApiEquiv / Math.max(proMonthly, monthApiEquiv)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Claude Pro cost (month)</span>
                      <span className="font-mono">{formatUSD(proMonthly)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy/30 rounded-full"
                        style={{ width: `${Math.min((proMonthly / Math.max(proMonthly, monthApiEquiv)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Session log */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Terminal Session Log</h3>
                  <span className="text-xs text-text-muted">{sessions.length} sessions · {formatTokens(allTokens.input + allTokens.output)} total tokens</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      {['Date', 'Task', 'Tokens In', 'Tokens Out', 'API Equiv'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...sessions].reverse().map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-primary-hover/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">{s.date}</td>
                        <td className="px-4 py-3 text-text-primary max-w-xs truncate" title={s.task}>{s.task}</td>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{formatTokens(s.tokens_input)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{formatTokens(s.tokens_output)}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{formatUSD(sessionApiCost(s))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-gray-50">
                      <td className="px-4 py-3 text-xs font-semibold text-text-secondary" colSpan={2}>Total</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{formatTokens(allTokens.input)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{formatTokens(allTokens.output)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{formatUSD(allApiEquiv)}</td>
                    </tr>
                  </tfoot>
                </table>
                <div className="px-5 py-3 border-t border-border bg-gray-50">
                  <p className="text-xs text-text-muted">
                    To log a new session: add an entry to <code className="font-mono bg-white px-1 py-0.5 rounded border border-border">briefs/token-log.json</code> with the token count from the Claude Code session summary, then copy to <code className="font-mono bg-white px-1 py-0.5 rounded border border-border">dashboard/public/token-log.json</code> and redeploy.
                  </p>
                </div>
              </div>
            </section>

          </>
        )}
      </main>
    </div>
  )
}
