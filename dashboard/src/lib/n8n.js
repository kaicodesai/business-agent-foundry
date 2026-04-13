const N8N_BASE = import.meta.env.VITE_N8N_BASE_URL
  ? `${import.meta.env.VITE_N8N_BASE_URL}/api/v1`
  : 'https://kaiashley.app.n8n.cloud/api/v1'
const API_KEY = import.meta.env.VITE_N8N_API_KEY

// Static workflow registry — source of truth for names + IDs
export const WORKFLOW_REGISTRY = [
  { id: '7RsRJIqBHFpWZoWM', name: 'Onboarding Automation',        description: 'Fires on payment — creates ClickUp project, sends welcome email, writes Airtable record' },
  { id: 'YO3f5CL9bYbLTBgw', name: 'Lead Generation',              description: 'Daily Hunter.io + Tavily search → ICP-matched prospects written to Airtable' },
  { id: 'Mib6RUtJ2IOaUZ4s', name: 'Outreach Agent',               description: 'Personalised cold email sequences queued in Instantly.ai from Airtable prospects' },
  { id: '94DpGwRPWGRPqCVU', name: 'Status Update Agent',          description: 'Weekly project status emails to active clients from ClickUp data' },
  { id: 'ka6GesSfWVo2FZtU', name: 'Referral Trigger Agent',       description: 'Automated referral request 30 days post-launch, queued in Instantly.ai' },
  { id: 'uiTwYIUk6nIFwLtX', name: 'ClickUp Sync',                 description: 'Syncs Airtable project_status to ClickUp task statuses every 2 hours' },
  { id: 'scj61gBYYWpQydMC', name: 'Reporting Agent',              description: 'Monthly performance reports for retainer clients — auto-generated and emailed' },
  { id: 'kXxN7O77ongTMwKG', name: 'Typeform Lead Qualification',  description: 'Scores inbound Typeform leads via Claude, emails Kai if Grade A/B' },
  { id: 'uTnQAq5VlmsHYih4', name: 'Credential Follow-Up',        description: 'Daily check for stalled onboarding clients — alerts Kai if credentials not submitted >48h' },
  { id: 'hbtSbm2pzrHX1QTn', name: 'Credential Detector',         description: 'Every 2h — detects n8n_api_key populated, auto-sets project_status to build.ready' },
  { id: 'EPMCxdqKOuwc6hzB', name: 'Website Chatbot',             description: 'Stateless 3-question lead scoring chatbot — hot leads booked to Calendly' },
  { id: 'E24KwVMam1e8bbjT', name: 'Scoping Agent',               description: 'Polls call_complete clients → Claude generates scope → emails Kai with Approve button' },
  { id: 'UB6ZdrnYpJlYfxD4', name: 'Scope Approval',             description: 'GET /approve-scope — locks scope, generates proposal draft, emails Kai' },
  { id: 'fy8OuUEGyyWhYzWC', name: 'Workflow Builder Agent',      description: 'Polls build.ready clients → deploys n8n workflow JSON → sets build_review' },
]

// Mock data for when API key is not configured
const MOCK_WORKFLOWS = WORKFLOW_REGISTRY.map((w, i) => ({
  id: w.id,
  name: w.name,
  active: i < 3, // first 3 are "active" in mock
  updatedAt: new Date(Date.now() - (i + 1) * 3600000 * 2).toISOString(),
  nodes: Math.floor(Math.random() * 10) + 8,
}))

const MOCK_EXECUTIONS = {
  '7RsRJIqBHFpWZoWM': { status: 'success', startedAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  'YO3f5CL9bYbLTBgw': { status: 'success', startedAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  'Mib6RUtJ2IOaUZ4s': { status: 'success', startedAt: new Date(Date.now() - 3600000 * 6).toISOString() },
}

async function n8nFetch(path) {
  const res = await fetch(`${N8N_BASE}${path}`, {
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`n8n API error ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchWorkflows() {
  if (!API_KEY) {
    console.warn('[n8n] No API key — returning mock workflow data')
    return MOCK_WORKFLOWS
  }
  try {
    const data = await n8nFetch('/workflows?limit=50')
    return (data.data || []).map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
      nodes: w.nodes?.length || 0,
    }))
  } catch (err) {
    console.error('[n8n] fetchWorkflows failed:', err)
    return MOCK_WORKFLOWS
  }
}

export async function fetchLastExecution(workflowId) {
  if (!API_KEY) {
    return MOCK_EXECUTIONS[workflowId] || null
  }
  try {
    const data = await n8nFetch(`/executions?workflowId=${workflowId}&limit=1`)
    const exec = (data.data || [])[0]
    if (!exec) return null
    return {
      status: exec.finished ? (exec.status || 'success') : 'running',
      startedAt: exec.startedAt,
    }
  } catch (err) {
    console.error(`[n8n] fetchLastExecution(${workflowId}) failed:`, err)
    return null
  }
}

export function mergeWorkflowData(liveWorkflows) {
  return WORKFLOW_REGISTRY.map((reg) => {
    const live = liveWorkflows.find((w) => w.id === reg.id)
    return {
      ...reg,
      active: live?.active ?? false,
      updatedAt: live?.updatedAt ?? null,
      nodes: live?.nodes ?? 0,
      found: !!live,
    }
  })
}

export function timeAgo(isoString) {
  if (!isoString) return 'unknown'
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
