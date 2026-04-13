import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import {
  fetchClients,
  fetchProspects,
  fetchActionItems,
  countNewLeadsThisWeek,
  countActiveClients,
  countHotLeads,
} from '../lib/airtable'
import { fetchWorkflows, mergeWorkflowData, timeAgo } from '../lib/n8n'
import { fetchTokenLog, weekSavings, formatUSD } from '../lib/tokenLog'

const PIPELINE_STAGES = [
  'new_lead', 'qualified', 'call_complete', 'scoping',
  'scope_review', 'onboarding', 'build.ready', 'building',
  'build_review', 'qa.in_progress', 'qa.pass', 'live', 'test-complete',
]

const STAGE_LABELS = {
  new_lead: 'New Lead', qualified: 'Qualified', call_complete: 'Call Done',
  scoping: 'Scoping', scope_review: 'Scope Review', onboarding: 'Onboarding',
  'build.ready': 'Build Ready', building: 'Building', build_review: 'Build Review',
  'qa.in_progress': 'QA In Progress', 'qa.pass': 'QA Pass', live: 'Live',
  'test-complete': 'Test Complete',
}

function daysSince(isoString) {
  if (!isoString) return 0
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000)
}

function stageDotColor(days) {
  if (days < 7) return 'bg-success'
  if (days <= 14) return 'bg-warning'
  return 'bg-error'
}

function StatCard({ label, value, trend }) {
  return (
    <div className="stat-card flex flex-col gap-1">
      <div className="flex items-start justify-between">
        <span className="text-3xl font-heading font-bold text-navy">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-success' : 'text-error'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</span>
    </div>
  )
}

function PipelineLane({ clients }) {
  const byStage = {}
  for (const s of PIPELINE_STAGES) byStage[s] = []
  for (const c of clients) {
    const s = c.fields?.project_status
    if (s && byStage[s]) byStage[s].push(c)
  }

  return (
    <div className="card p-5">
      <h2 className="font-heading font-semibold text-text-primary text-sm mb-4">Pipeline</h2>
      <div className="overflow-x-auto -mx-1">
        <div className="flex gap-3 pb-2 min-w-max px-1">
          {PIPELINE_STAGES.map((stage) => {
            const cards = byStage[stage] || []
            return (
              <div key={stage} className="w-36 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-text-muted truncate">
                    {STAGE_LABELS[stage]}
                  </span>
                  {cards.length > 0 && (
                    <span className="badge-orange text-[10px] px-1.5 py-0 ml-1">{cards.length}</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {cards.length === 0 && (
                    <div className="h-8 rounded-lg border border-dashed border-border" />
                  )}
                  {cards.map((c) => {
                    const days = daysSince(c.fields?.created_at)
                    return (
                      <div
                        key={c.id}
                        className="bg-surface border border-border rounded-lg p-2 shadow-card text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stageDotColor(days)}`} />
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {c.fields?.company_name}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted mt-0.5 pl-3">{days}d</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── KAI'S VIEW ─────────────────────────────────────────────────────────────

function KaiView({ clients, prospects, actionItems, workflows, tokenSavings }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const newLeads = countNewLeadsThisWeek(prospects)
  const activeClients = countActiveClients(clients)
  const needsAction = actionItems.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-bold text-2xl text-text-primary">{greeting}, Kai</h2>
        <p className="text-text-muted text-sm mt-0.5">{today}</p>
      </div>

      {/* Row 1 — Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="New Leads (7d)" value={newLeads} trend={2} />
        <StatCard label="Active Clients" value={activeClients} />
        <StatCard label="Needs Your Action" value={needsAction} />
        <StatCard label="Token Savings (7d)" value={tokenSavings} />
      </div>

      {/* Row 2 — Pipeline */}
      <PipelineLane clients={clients} />

      {/* Row 3 — Two columns */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Needs Your Attention */}
        <div className="card p-5">
          <h2 className="font-heading font-semibold text-text-primary text-sm mb-4">
            Needs Your Attention
          </h2>
          {actionItems.length === 0 ? (
            <p className="text-text-muted text-sm">All clear — nothing needs your attention.</p>
          ) : (
            <ul className="space-y-2">
              {actionItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm text-text-primary">{item.label}</span>
                  </div>
                  <span className="text-text-muted text-sm flex-shrink-0">→</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* System Status */}
        <div className="card p-5">
          <h2 className="font-heading font-semibold text-text-primary text-sm mb-4">
            System Status
          </h2>
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {workflows.map((wf) => (
              <li
                key={wf.id}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wf.active ? 'bg-success' : 'bg-gray-300'}`} />
                  <span className="text-xs text-text-primary truncate max-w-[160px]">{wf.name}</span>
                </div>
                <span className="text-[11px] text-text-muted flex-shrink-0 ml-2">
                  {timeAgo(wf.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ── HOWARD'S VIEW ────────────────────────────────────────────────────────────

const isFriday = new Date().getDay() === 5

const DAILY_TASKS = {
  'Content': [
    { id: 'content-1', label: 'Post #1 due today — Draft needed', done: false },
  ],
  'Outreach': [
    { id: 'outreach-1', label: 'Check Instantly.ai for warm replies', done: false },
    { id: 'outreach-2', label: 'Review new leads added overnight', done: false },
  ],
  'Calls': [
    { id: 'calls-1', label: 'No calls booked — check Calendly', done: false },
  ],
  'Admin': [
    ...(isFriday ? [{ id: 'admin-friday', label: 'Friday report due', done: false }] : []),
    { id: 'admin-expenses', label: "Log this week's expenses", done: false },
  ],
}

const CATEGORY_ICONS = {
  Content: '📣',
  Outreach: '📬',
  Calls: '📞',
  Admin: '📋',
}

function HowardView({ prospects }) {
  const [tasks, setTasks] = useState(DAILY_TASKS)
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const hotLeads = countHotLeads(prospects)
  const recentLeads = [...prospects]
    .sort((a, b) => new Date(b.fields?.sourced_at || 0) - new Date(a.fields?.sourced_at || 0))
    .slice(0, 10)

  const toggleTask = (category, id) => {
    setTasks((prev) => ({
      ...prev,
      [category]: prev[category].map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-bold text-2xl text-text-primary">{greeting}, Howard</h2>
        <p className="text-text-muted text-sm mt-0.5">{today}</p>
      </div>

      {/* Row 1 — Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Hot Leads (A/B)" value={hotLeads} trend={1} />
        <StatCard label="Calls This Week" value="—" />
        <StatCard label="Content Posted" value="—" />
      </div>

      {/* Row 2 — Today's Tasks */}
      <div className="card p-5">
        <h2 className="font-heading font-semibold text-text-primary text-sm mb-4">
          Today's Tasks
        </h2>
        <div className="space-y-5">
          {Object.entries(tasks).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                {CATEGORY_ICONS[category]} {category}
              </h3>
              <ul className="space-y-1.5">
                {items.map((task) => (
                  <li key={task.id} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleTask(category, task.id)}
                      className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${
                        task.done
                          ? 'bg-primary border-primary'
                          : 'border-border bg-white hover:border-primary'
                      }`}
                    >
                      {task.done && (
                        <svg viewBox="0 0 12 12" fill="white" className="w-3 h-3 mx-auto">
                          <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                    <span className={`text-sm ${task.done ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                      {task.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 — Recent Leads table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-text-primary text-sm">Recent Leads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {['Name', 'Company', 'Grade', 'Source', 'Added', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((p) => {
                const grade = p.fields?.lead_score_grade
                const added = p.fields?.sourced_at
                  ? new Date(p.fields.sourced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-primary-hover/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{p.fields?.prospect_name || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{p.fields?.company_name || '—'}</td>
                    <td className="px-4 py-3">
                      {grade ? (
                        <span className={['A', 'B'].includes(grade) ? 'badge-orange' : 'badge-gray'}>
                          {grade}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted capitalize">{p.fields?.lead_source || '—'}</td>
                    <td className="px-4 py-3 text-text-muted font-mono text-xs">{added}</td>
                    <td className="px-4 py-3">
                      <span className="badge-gray capitalize">{p.fields?.outreach_status || '—'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [view, setView] = useState('kai')
  const [clients, setClients] = useState([])
  const [prospects, setProspects] = useState([])
  const [actionItems, setActionItems] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [tokenSavings, setTokenSavings] = useState('—')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [c, p, a, wf, tl] = await Promise.all([
      fetchClients(),
      fetchProspects(),
      fetchActionItems(),
      fetchWorkflows(),
      fetchTokenLog(),
    ])
    setClients(c)
    setProspects(p)
    setActionItems(a)
    setWorkflows(mergeWorkflowData(wf))
    setTokenSavings(formatUSD(weekSavings(tl)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Founders Dashboard" onRefresh={load} lastUpdated="just now" />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {/* Toggle */}
        <div className="mb-6 inline-flex bg-surface border border-border rounded-xl p-1 shadow-card">
          {[['kai', "Kai's View"], ['howard', "Howard's View"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                view === key
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'kai' ? (
          <KaiView
            clients={clients}
            prospects={prospects}
            actionItems={actionItems}
            workflows={workflows}
            tokenSavings={tokenSavings}
          />
        ) : (
          <HowardView prospects={prospects} />
        )}
      </main>
    </div>
  )
}
