import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import { fetchClients } from '../lib/airtable'
import { fetchTokenLog, totalSavings, monthSavings, weekSavings, savingsByAgent, formatUSD } from '../lib/tokenLog'

// ── Service tier pricing ────────────────────────────────────────────────────
const TIER_VALUE = {
  'starter-build':   1500,
  'growth-build':    3500,
  'scale-build':     6500,
  'retainer':        1200, // per month
  'agency-retainer': 2500,
}

const ACTIVE_STATUSES = new Set([
  'onboarding', 'onboarding.in_progress', 'build.ready', 'building',
  'build_review', 'qa.in_progress', 'qa.pass', 'live',
])

const PIPELINE_STATUSES = new Set([
  'new_lead', 'qualified', 'call_complete', 'scoping', 'scope_review',
])

// Conversion probability by stage
const STAGE_PROBABILITY = {
  new_lead: 0.10, qualified: 0.25, call_complete: 0.45,
  scoping: 0.65, scope_review: 0.80,
}

const AVG_DEAL_VALUE = 3000 // fallback when no tier set

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`bg-surface border rounded-card shadow-card p-5 flex flex-col gap-1 ${accent ? 'border-l-4 border-l-primary border-t border-r border-b border-border' : 'border border-border'}`}>
      <span className="text-2xl font-heading font-bold text-navy">{value}</span>
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

// ── Google Sheets placeholder ────────────────────────────────────────────────
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

export default function Financials() {
  const [clients, setClients] = useState([])
  const [tokenRuns, setTokenRuns] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [c, tl] = await Promise.all([fetchClients(), fetchTokenLog()])
    setClients(c)
    setTokenRuns(tl)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Revenue calculations ──────────────────────────────────────────────────

  // Confirmed: clients who have passed onboarding or are active/live
  const confirmedClients = clients.filter((c) =>
    ACTIVE_STATUSES.has(c.fields?.project_status) || c.fields?.project_status === 'test-complete'
  )
  const confirmedRevenue = confirmedClients.reduce((sum, c) => {
    const tier = c.fields?.service_tier
    const val = c.fields?.proposal_value || TIER_VALUE[tier] || AVG_DEAL_VALUE
    return sum + val
  }, 0)

  // Pipeline: weighted by stage probability
  const pipelineClients = clients.filter((c) => PIPELINE_STATUSES.has(c.fields?.project_status))
  const pipelineRevenue = pipelineClients.reduce((sum, c) => {
    const prob = STAGE_PROBABILITY[c.fields?.project_status] || 0.1
    const val = c.fields?.proposal_value || AVG_DEAL_VALUE
    return sum + val * prob
  }, 0)

  // MRR: retainer clients × monthly value
  const retainerClients = confirmedClients.filter((c) =>
    ['retainer', 'agency-retainer'].includes(c.fields?.service_tier)
  )
  const mrr = retainerClients.reduce((sum, c) => {
    return sum + (TIER_VALUE[c.fields?.service_tier] || 0)
  }, 0)

  // Token savings
  const totalTokenSavings = totalSavings(tokenRuns)
  const thisWeekSavings = weekSavings(tokenRuns)
  const thisMonthSavings = monthSavings(tokenRuns)
  const byAgent = savingsByAgent(tokenRuns)
  const totalApiCost = tokenRuns.reduce((s, r) => s + (r.cost_usd || 0), 0)

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
            {/* ── Revenue overview ── */}
            <section>
              <SectionHeader
                title="Revenue"
                sub="Confirmed = clients in active/live stage. Pipeline = weighted by conversion probability."
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard accent label="Confirmed Revenue" value={formatUSD(confirmedRevenue)} sub={`${confirmedClients.length} clients`} />
                <StatCard accent label="Pipeline (Weighted)" value={formatUSD(pipelineRevenue)} sub={`${pipelineClients.length} leads`} />
                <StatCard label="MRR (Retainers)" value={mrr > 0 ? formatUSD(mrr) : '—'} sub={`${retainerClients.length} retainer clients`} />
                <StatCard label="Total Potential" value={formatUSD(confirmedRevenue + pipelineRevenue)} sub="Confirmed + pipeline" />
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
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-text-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...confirmedClients, ...pipelineClients].map((c) => {
                      const isConfirmed = ACTIVE_STATUSES.has(c.fields?.project_status)
                      const tier = c.fields?.service_tier
                      const val = c.fields?.proposal_value || TIER_VALUE[tier] || AVG_DEAL_VALUE
                      const prob = STAGE_PROBABILITY[c.fields?.project_status]
                      return (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-primary-hover/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-text-primary">{c.fields?.company_name}</td>
                          <td className="px-4 py-3">
                            <span className={isConfirmed ? 'badge-active' : 'badge-gray'}>
                              {c.fields?.project_status}
                            </span>
                          </td>
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
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-text-muted text-sm">
                          No clients in Airtable yet — mock data shown on dashboard
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Income & Expenses (Google Sheets) ── */}
            <section>
              <SectionHeader
                title="Income & Expenses"
                sub="Howard's tracking sheet — connect Google Sheets to show monthly P&L"
              />
              <SheetsPlaceholder />
            </section>

            {/* ── Token savings ── */}
            <section>
              <SectionHeader
                title="AI Cost Savings"
                sub={`Every agent run saves hours of manual work. API cost vs human equivalent at $50/hr.`}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <StatCard accent label="Total Savings" value={formatUSD(totalTokenSavings)} />
                <StatCard accent label="This Month" value={formatUSD(thisMonthSavings)} />
                <StatCard label="This Week" value={formatUSD(thisWeekSavings)} />
                <StatCard label="Total API Cost" value={formatUSD(totalApiCost)} sub="Anthropic charges" />
              </div>

              {/* By agent table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Savings by Agent</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      {['Agent', 'Runs', 'API Cost', 'Time Saved Value', 'Net Saving'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-text-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byAgent.map((row) => (
                      <tr key={row.agent} className="border-b border-border last:border-0 hover:bg-primary-hover/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary capitalize">{row.agent.replace(/-/g, ' ')}</td>
                        <td className="px-4 py-3 text-text-secondary">{row.runs}</td>
                        <td className="px-4 py-3 font-mono text-xs text-text-muted">{formatUSD(row.cost_usd)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-success">{formatUSD(row.saving_usd + row.cost_usd)}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-navy">{formatUSD(row.saving_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
