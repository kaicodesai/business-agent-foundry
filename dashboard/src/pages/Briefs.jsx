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
import {
  fetchTokenLog,
  monthlySavings,
  sessionsThisMonth,
  totalApiEquivalent,
  formatUSD,
} from '../lib/tokenLog'
import { fetchInProgressItems } from '../lib/projectOverview'

const STAGE_LABELS = {
  'lead':                   'Lead',
  'proposal_sent':          'Proposal Sent',
  'onboarding.in_progress': 'Onboarding',
  'onboarding.stalled':     'Stalled',
  'build.ready':            'Build Ready',
  'build.in_progress':      'Building',
  'build.blocked':          'Blocked',
  'build.complete':         'Built',
  'qa.in_progress':         'QA',
  'qa.pass':                'QA Pass',
  'qa.fail':                'QA Fail',
  'activation.pending':     'Activating',
  'live':                   'Live',
  'test-complete':          'Test Done',
}

const WARN_STAGES = new Set(['onboarding.stalled', 'build.blocked', 'qa.fail'])

function Section({ title, badge, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <h2 className="font-heading font-semibold text-text-primary text-sm">{title}</h2>
        {badge != null && badge > 0 && (
          <span className="badge-orange">{badge}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function QBBrief({ data }) {
  const { clients, prospects, actionItems, workflows, tokenLog } = data

  const activeCount    = countActiveClients(clients)
  const hotLeadsCount  = countHotLeads(prospects)
  const newLeadsCount  = countNewLeadsThisWeek(prospects)
  const activeFlows    = workflows.filter((w) => w.active).length
  const sessions       = tokenLog.sessions || []
  const monthSavings   = monthlySavings(sessions)
  const monthApiTotal  = totalApiEquivalent(sessionsThisMonth(sessions))

  // Pipeline snapshot
  const stageGroups = {}
  for (const c of clients) {
    const s = c.fields?.project_status
    if (s) stageGroups[s] = (stageGroups[s] || 0) + 1
  }

  // Blockers
  const blockers = clients.filter((c) => WARN_STAGES.has(c.fields?.project_status))

  // Recent prospects
  const recentLeads = [...prospects]
    .sort((a, b) => new Date(b.fields?.sourced_at || 0) - new Date(a.fields?.sourced_at || 0))
    .slice(0, 6)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const statusLine = blockers.length > 0
    ? `${blockers.length} client${blockers.length > 1 ? 's' : ''} need${blockers.length === 1 ? 's' : ''} unblocking`
    : actionItems.length > 0
    ? `${actionItems.length} item${actionItems.length > 1 ? 's' : ''} need your attention`
    : 'Business is running clean — nice work'

  return (
    <div className="max-w-3xl space-y-5">

      {/* ── Header brief card ───────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-6 py-5 bg-navy text-white">
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-1">
            QB Daily Brief · Phoenix Automation
          </p>
          <h1 className="font-heading font-bold text-xl text-white leading-tight">{today}</h1>
          <p className="text-white/70 text-sm mt-1.5">{statusLine}</p>
        </div>

        {/* Pulse metrics */}
        <div className="grid grid-cols-4 divide-x divide-border border-t border-border">
          {[
            ['Active Clients', activeCount],
            ['Hot Leads',      hotLeadsCount],
            ['New Leads (7d)', newLeadsCount],
            ['Flows Live',     activeFlows],
          ].map(([label, val]) => (
            <div key={label} className="px-4 py-4 text-center">
              <p className="text-2xl font-bold font-heading text-navy">{val}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Blockers (only if any) ───────────────────────────────────── */}
      {blockers.length > 0 && (
        <Section title="Blockers — Needs Immediate Attention" badge={blockers.length}>
          <ul className="space-y-2">
            {blockers.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-error flex-shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-text-primary">
                      {c.fields?.company_name}
                    </span>
                    <span className="text-xs text-text-muted ml-2">{c.fields?.contact_name}</span>
                  </div>
                </div>
                <span className="badge-error text-[10px]">
                  {STAGE_LABELS[c.fields?.project_status] || c.fields?.project_status}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Action items ─────────────────────────────────────────────── */}
      <Section title="Needs Your Attention" badge={actionItems.length}>
        {actionItems.length === 0 ? (
          <p className="text-text-muted text-sm">All clear — nothing pending.</p>
        ) : (
          <ul className="space-y-1">
            {actionItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 py-2 border-b border-border last:border-0"
              >
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span className="text-sm text-text-primary leading-snug">{item.label}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── Pipeline snapshot ────────────────────────────────────────── */}
      <Section title="Pipeline Snapshot">
        {Object.keys(stageGroups).length === 0 ? (
          <p className="text-text-muted text-sm">No clients in pipeline yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stageGroups)
              .sort(([a], [b]) => {
                const order = Object.keys(STAGE_LABELS)
                return order.indexOf(a) - order.indexOf(b)
              })
              .map(([stage, count]) => {
                const isWarn = WARN_STAGES.has(stage)
                return (
                  <div
                    key={stage}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${isWarn ? 'bg-red-50' : 'bg-gray-50'}`}
                  >
                    <span className={`text-sm font-bold font-heading ${isWarn ? 'text-error' : 'text-navy'}`}>
                      {count}
                    </span>
                    <span className={`text-xs ${isWarn ? 'text-error' : 'text-text-muted'}`}>
                      {STAGE_LABELS[stage] || stage}
                    </span>
                  </div>
                )
              })}
          </div>
        )}
      </Section>

      {/* ── Recent leads ─────────────────────────────────────────────── */}
      <Section title="Recent Leads" badge={recentLeads.length}>
        {recentLeads.length === 0 ? (
          <p className="text-text-muted text-sm">No prospects yet.</p>
        ) : (
          <ul className="space-y-0">
            {recentLeads.map((p) => {
              const grade = p.fields?.lead_score_grade
              const added = p.fields?.sourced_at
                ? new Date(p.fields.sourced_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })
                : '—'
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={grade && ['A', 'B'].includes(grade) ? 'badge-orange' : 'badge-gray'}>
                      {grade || '?'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary leading-tight">
                        {p.fields?.prospect_name || '—'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {p.fields?.company_name} · {p.fields?.industry}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="badge-gray text-[10px] capitalize block mb-0.5">
                      {p.fields?.outreach_status || '—'}
                    </span>
                    <p className="text-[11px] text-text-muted font-mono">{added}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {/* ── Agent status ─────────────────────────────────────────────── */}
      <Section title="Agent Status">
        {workflows.length === 0 ? (
          <p className="text-text-muted text-sm">No workflow data — check n8n API key.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-0">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 sm:last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      wf.active ? 'bg-success' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-xs text-text-primary truncate max-w-[170px]">{wf.name}</span>
                </div>
                <span className="text-[11px] text-text-muted ml-3 flex-shrink-0">
                  {timeAgo(wf.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Claude Pro savings ───────────────────────────────────────── */}
      <Section title="Claude Pro Savings — This Month">
        <div className="flex items-end gap-3 mb-2">
          <span className="text-3xl font-bold font-heading text-navy">
            {formatUSD(Math.max(0, monthSavings))}
          </span>
          <span className="text-sm text-text-muted mb-1">saved vs API credits</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">API equivalent</p>
            <p className="font-medium text-text-primary font-mono">{formatUSD(monthApiTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Pro cost</p>
            <p className="font-medium text-text-primary font-mono">$20.00</p>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3">
          All Claude Code terminal sessions run on Pro subscription ($20/mo flat) instead of paying per-token API credits.
        </p>
      </Section>

    </div>
  )
}

export default function Briefs() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [clients, prospects, airtableActions, wf, tokenLog, overviewItems] = await Promise.all([
      fetchClients(),
      fetchProspects(),
      fetchActionItems(),
      fetchWorkflows(),
      fetchTokenLog(),
      fetchInProgressItems(),
    ])
    setData({
      clients,
      prospects,
      actionItems: [...overviewItems, ...airtableActions],
      workflows:   mergeWorkflowData(wf),
      tokenLog,
    })
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="QB Brief" onRefresh={load} />
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <QBBrief data={data} />
        ) : null}
      </main>
    </div>
  )
}
