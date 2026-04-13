import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import { fetchClients } from '../lib/airtable'

const STAGES = [
  'lead', 'proposal_sent', 'onboarding.in_progress', 'onboarding.stalled',
  'build.ready', 'build.in_progress', 'build.blocked', 'build.complete',
  'qa.in_progress', 'qa.pass', 'qa.fail', 'activation.pending', 'live', 'test-complete',
]

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

function daysSince(iso) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function stageDot(days) {
  if (days < 7) return 'bg-success'
  if (days <= 14) return 'bg-warning'
  return 'bg-error'
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  )
}

function ClientDetail({ client, onClose }) {
  const f = client.fields || {}
  const fields = [
    ['Company', f.company_name],
    ['Contact', f.contact_name],
    ['Email', f.email],
    ['Status', f.project_status],
    ['Tier', f.service_tier],
    ['Industry', f.industry],
    ['n8n Key', f.n8n_api_key ? '✓ Set' : '— not set'],
    ['ClickUp Folder', f.clickup_folder_id || '—'],
    ['Started', f.onboarding_started_at ? new Date(f.onboarding_started_at).toLocaleDateString() : '—'],
    ['QA Verdict', f.qa_verdict || '—'],
    ['Notes', f.Notes || '—'],
  ]

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Panel */}
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface shadow-slide-over flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-heading font-bold text-text-primary text-base">{f.company_name}</h2>
            <p className="text-xs text-text-muted mt-0.5">{f.contact_name} · {f.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-50 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Status badge */}
        <div className="px-6 py-3 border-b border-border">
          <span className="badge-orange">{STAGE_LABELS[f.project_status] || f.project_status}</span>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col py-3 border-b border-border last:border-0">
              <span className="text-[11px] uppercase tracking-wide font-semibold text-text-muted">{label}</span>
              <span className="text-sm text-text-primary mt-0.5 break-all">{value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Pipeline() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true)
    const c = await fetchClients()
    setClients(c)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  const byStage = {}
  for (const s of STAGES) byStage[s] = []
  for (const c of clients) {
    const s = c.fields?.project_status
    if (s && byStage[s]) byStage[s].push(c)
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Pipeline" onRefresh={load} />
      <main className="flex-1 p-6 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-4 min-w-max pb-4">
            {STAGES.map((stage) => {
              const cards = byStage[stage] || []
              const isWarn = WARN_STAGES.has(stage)
              return (
                <div key={stage} className="w-44 flex-shrink-0">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className={`text-[10px] uppercase tracking-widest font-semibold truncate ${isWarn ? 'text-error' : 'text-text-muted'}`}>
                      {STAGE_LABELS[stage]}
                    </span>
                    {cards.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0 ml-1 ${isWarn ? 'badge-error' : 'badge-orange'}`}>
                        {cards.length}
                      </span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {cards.length === 0 && (
                      <div className="h-12 rounded-card border-2 border-dashed border-border" />
                    )}
                    {cards.map((c) => {
                      const days = daysSince(c.createdTime || c.fields?.created_at)
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelected(c)}
                          className={`w-full text-left bg-surface border rounded-card shadow-card p-3 hover:shadow-card-hover transition-all duration-200 ${isWarn ? 'border-error/30 hover:border-error/50' : 'border-border hover:border-primary/30'}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isWarn ? 'bg-error' : stageDot(days)}`} />
                            <span className="text-xs font-semibold text-text-primary leading-tight">
                              {c.fields?.company_name}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted pl-4">{days > 0 ? `${days}d` : 'today'}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {selected && (
        <ClientDetail client={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
