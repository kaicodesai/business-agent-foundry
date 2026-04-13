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
import { fetchTokenLog, sessionsThisWeek, totalApiEquivalent, formatUSD } from '../lib/tokenLog'
import { fetchInProgressItems } from '../lib/projectOverview'

// Real Airtable project_status values (from schema)
const PIPELINE_STAGES = [
  'lead', 'proposal_sent', 'onboarding.in_progress', 'onboarding.stalled',
  'build.ready', 'build.in_progress', 'build.blocked', 'build.complete',
  'qa.in_progress', 'qa.pass', 'qa.fail', 'activation.pending', 'live', 'test-complete',
]

const STAGE_LABELS = {
  'lead':                 'Lead',
  'proposal_sent':        'Proposal Sent',
  'onboarding.in_progress': 'Onboarding',
  'onboarding.stalled':   'Stalled',
  'build.ready':          'Build Ready',
  'build.in_progress':    'Building',
  'build.blocked':        'Blocked',
  'build.complete':       'Built',
  'qa.in_progress':       'QA',
  'qa.pass':              'QA Pass',
  'qa.fail':              'QA Fail',
  'activation.pending':   'Activating',
  'live':                 'Live',
  'test-complete':        'Test Done',
}

// Stages that need immediate attention (visual warning)
const WARN_STAGES = new Set(['onboarding.stalled', 'build.blocked', 'qa.fail'])

// ── System Test Checklist ────────────────────────────────────────────────────
// Full end-to-end 3-layer OS validation — Kai reviews, Haris executes
const SYSTEM_TEST_STEPS = [
  {
    id: 'st-01',
    label: 'Website Chatbot — E2E tested, live on phoenixautomation.ai',
    owner: 'both',
    done: true,
  },
  {
    id: 'st-02',
    label: 'Typeform Lead Qualification — activate workflow, submit test form, verify scoring email to Kai',
    owner: 'haris',
  },
  {
    id: 'st-03',
    label: "Outreach Agent — clean 19 Instantly duplicates, activate, verify branded HTML email send",
    owner: 'haris',
  },
  {
    id: 'st-04',
    label: "Scoping Agent — trigger /scope-call with Sarah's Wellness Studio call notes",
    owner: 'haris',
  },
  {
    id: 'st-05',
    label: 'Scope Approval — Kai approves scope via email link, verify proposal draft saved in Airtable',
    owner: 'kai',
  },
  {
    id: 'st-06',
    label: 'Onboarding Automation — POST /payment-confirmed with test client, verify ClickUp project + welcome emails',
    owner: 'haris',
  },
  {
    id: 'st-07',
    label: 'Credential Detector — set n8n_api_key in Airtable, verify auto-sets project_status = build.ready',
    owner: 'haris',
  },
  {
    id: 'st-08',
    label: 'Workflow Builder Agent — activate, verify client workflows deployed to client n8n instance',
    owner: 'haris',
  },
  {
    id: 'st-09',
    label: 'QA Agent — run full QA checklist on all deployed workflows, report pass/fail to Kai',
    owner: 'haris',
  },
  {
    id: 'st-10',
    label: 'Kai reviews QA pass — activate workflows, set project_status = live in Airtable',
    owner: 'kai',
  },
  {
    id: 'st-11',
    label: 'Status Update Agent — trigger manually, verify branded weekly status email delivered to client',
    owner: 'haris',
  },
  {
    id: 'st-12',
    label: 'Reporting Agent — trigger monthly report, verify Claude generates summary + email delivered',
    owner: 'haris',
  },
  {
    id: 'st-13',
    label: 'Referral Trigger Agent — E2E tested PASS (2026-03-27)',
    owner: 'both',
    done: true,
  },
]

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
    if (s && byStage[s] !== undefined) byStage[s].push(c)
  }
  const totalInPipeline = clients.length

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-text-primary text-sm">Pipeline</h2>
        <span className="text-xs text-text-muted">{totalInPipeline} total · scroll →</span>
      </div>
      <div className="overflow-x-auto -mx-1">
        <div className="flex gap-3 pb-3 min-w-max px-1">
          {PIPELINE_STAGES.map((stage) => {
            const cards = byStage[stage] || []
            const isWarn = WARN_STAGES.has(stage)
            return (
              <div key={stage} className="w-36 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] uppercase tracking-widest font-semibold truncate ${isWarn ? 'text-error' : 'text-text-muted'}`}>
                    {STAGE_LABELS[stage]}
                  </span>
                  {cards.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0 ml-1 ${isWarn ? 'badge-error' : 'badge-orange'}`}>{cards.length}</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {cards.length === 0 && (
                    <div className="h-8 rounded-lg border border-dashed border-border" />
                  )}
                  {cards.map((c) => {
                    const days = daysSince(c.fields?.onboarding_started_at || c.createdTime)
                    return (
                      <div
                        key={c.id}
                        className={`bg-surface border rounded-lg p-2 shadow-card text-left ${isWarn ? 'border-error/30' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWarn ? 'bg-error' : stageDotColor(days)}`} />
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {c.fields?.company_name}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted mt-0.5 pl-3">{days > 0 ? `${days}d` : 'today'}</p>
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

// ── WHAT'S NEXT ─────────────────────────────────────────────────────────────

const OWNER_COLOR = { kai: 'bg-primary', haris: 'bg-blue-400', both: 'bg-gray-400' }
const OWNER_LABEL = { kai: 'Kai', haris: 'Haris', both: 'Both' }

function WhatsNext() {
  const [checked, setChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kai-system-test') || '{}')
    } catch {
      return {}
    }
  })

  const isChecked = (step) => step.done || checked[step.id] || false

  const toggle = (id) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('kai-system-test', JSON.stringify(next))
      return next
    })
  }

  const completedCount = SYSTEM_TEST_STEPS.filter((s) => isChecked(s)).length
  const pct = Math.round((completedCount / SYSTEM_TEST_STEPS.length) * 100)

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-border">
        <div>
          <h2 className="font-heading font-semibold text-text-primary text-sm">
            What's Next — Full System Test
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            End-to-end 3-layer OS validation · {completedCount}/{SYSTEM_TEST_STEPS.length} steps complete
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-shrink-0 ml-4">
          <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-text-secondary w-8 text-right">{pct}%</span>
        </div>
      </div>

      {/* Steps */}
      <ul className="space-y-0">
        {SYSTEM_TEST_STEPS.map((step) => {
          const done = isChecked(step)
          return (
            <li
              key={step.id}
              className="flex items-start gap-3 py-2 border-b border-border last:border-0"
            >
              <button
                onClick={() => !step.done && toggle(step.id)}
                disabled={step.done}
                aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${
                  done
                    ? 'bg-success border-success cursor-default'
                    : 'border-border hover:border-primary cursor-pointer bg-white'
                }`}
              >
                {done && (
                  <svg viewBox="0 0 12 12" className="w-3 h-3 mx-auto">
                    <path
                      d="M2 6L5 9 10 3"
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <span
                className={`text-sm leading-snug flex-1 ${
                  done ? 'line-through text-text-muted' : 'text-text-primary'
                }`}
              >
                {step.label}
              </span>
              <span
                title={`Owner: ${OWNER_LABEL[step.owner]}`}
                className={`flex-shrink-0 mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${OWNER_COLOR[step.owner]}`}
              >
                {OWNER_LABEL[step.owner]}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-border">
        {Object.entries(OWNER_LABEL).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={`w-2 h-2 rounded-full ${OWNER_COLOR[key]}`} />
            {label}
          </div>
        ))}
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
        <StatCard label="API Credits Saved (7d)" value={tokenSavings} />
      </div>

      {/* Row 2 — Pipeline */}
      <PipelineLane clients={clients} />

      {/* Row 3 — Two columns */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Needs Your Attention — live from PROJECT_OVERVIEW.md In Progress section */}
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

      {/* Row 4 — What's Next system test checklist */}
      <WhatsNext />
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
    const [c, p, a, wf, tl, overviewItems] = await Promise.all([
      fetchClients(),
      fetchProspects(),
      fetchActionItems(),
      fetchWorkflows(),
      fetchTokenLog(),
      fetchInProgressItems(),
    ])
    setClients(c)
    setProspects(p)
    setActionItems([...overviewItems, ...a])
    setWorkflows(mergeWorkflowData(wf))
    setTokenSavings(formatUSD(totalApiEquivalent(sessionsThisWeek(tl.sessions || tl))))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

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
