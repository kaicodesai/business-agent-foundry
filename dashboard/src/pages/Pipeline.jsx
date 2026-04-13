import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import { fetchClients } from '../lib/airtable'

const STAGES = [
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

  useEffect(() => { load() }, [])

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
              return (
                <div key={stage} className="w-44 flex-shrink-0">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-text-muted">
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="badge-orange text-[10px] px-1.5 py-0">{cards.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {cards.length === 0 && (
                      <div className="h-12 rounded-card border-2 border-dashed border-border" />
                    )}
                    {cards.map((c) => {
                      const days = daysSince(c.fields?.created_at)
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelected(c)}
                          className="w-full text-left bg-surface border border-border rounded-card shadow-card p-3 hover:shadow-card-hover hover:border-primary/30 transition-all duration-200"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stageDot(days)}`} />
                            <span className="text-xs font-semibold text-text-primary leading-tight">
                              {c.fields?.company_name}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted pl-4">{days}d in stage</p>
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
