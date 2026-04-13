const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || 'appMLHig3CN7WW0iW'
const CLIENTS_TABLE = import.meta.env.VITE_AIRTABLE_CLIENTS_TABLE || 'tblfvqqyYukRJQYmQ'
const PROSPECTS_TABLE = import.meta.env.VITE_AIRTABLE_PROSPECTS_TABLE || 'tbluEsKoQ2p49ktVq'
const API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`

// --- Mock data ---

const MOCK_CLIENTS = [
  {
    id: 'rec001',
    fields: {
      company_name: 'Brightline Property Mgmt',
      contact_name: 'Sarah Chen',
      email: 'sarah@brightline.com',
      project_status: 'live',
      service_tier: 'growth-build',
      industry: 'Property Management',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  },
  {
    id: 'rec002',
    fields: {
      company_name: "Sarah's Wellness Studio",
      contact_name: 'Sarah Johnson',
      email: 'sarah@wellnessstudio.com',
      project_status: 'build_review',
      service_tier: 'starter-build',
      industry: 'Health & Wellness',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
  },
  {
    id: 'rec003',
    fields: {
      company_name: 'Meridian Consulting Group',
      contact_name: 'James Meridian',
      email: 'james@meridiancg.com',
      project_status: 'qa.pass',
      service_tier: 'growth-build',
      industry: 'Consulting',
      created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    },
  },
  {
    id: 'rec004',
    fields: {
      company_name: 'Summit Trades Co',
      contact_name: 'Mike Torres',
      email: 'mike@summittrades.com',
      project_status: 'onboarding',
      service_tier: 'starter-build',
      industry: 'Trades',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
  },
  {
    id: 'rec005',
    fields: {
      company_name: 'RiverBend Dental',
      contact_name: 'Dr. Emily Park',
      email: 'emily@riverbend.com',
      project_status: 'scope_review',
      service_tier: 'growth-build',
      industry: 'Healthcare',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  },
  {
    id: 'rec006',
    fields: {
      company_name: 'Coastal Retail Group',
      contact_name: 'Tom Nguyen',
      email: 'tom@coastalretail.com',
      project_status: 'new_lead',
      service_tier: null,
      industry: 'Retail',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  },
  {
    id: 'rec007',
    fields: {
      company_name: 'Apex Logistics',
      contact_name: 'Raj Patel',
      email: 'raj@apexlogistics.com',
      project_status: 'qualified',
      service_tier: null,
      industry: 'Logistics',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  },
]

const MOCK_PROSPECTS = [
  {
    id: 'prosp001',
    fields: {
      prospect_name: 'Alex Rivera',
      company_name: 'Rivera Construction',
      industry: 'Construction',
      job_title: 'Owner',
      email: 'alex@riveraconstruction.com',
      lead_score_grade: 'A',
      outreach_status: 'pending',
      lead_source: 'website_chatbot',
      sourced_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  },
  {
    id: 'prosp002',
    fields: {
      prospect_name: 'Maya Chen',
      company_name: 'Chen Accounting',
      industry: 'Professional Services',
      job_title: 'Founder',
      email: 'maya@chenaccounting.com',
      lead_score_grade: 'B',
      outreach_status: 'in_sequence',
      lead_source: 'hunter',
      sourced_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  },
  {
    id: 'prosp003',
    fields: {
      prospect_name: 'David Kim',
      company_name: 'Kim Family Dental',
      industry: 'Healthcare',
      job_title: 'CEO',
      email: 'david@kimfamilydental.com',
      lead_score_grade: 'A',
      outreach_status: 'replied',
      lead_source: 'website_chatbot',
      sourced_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  },
  {
    id: 'prosp004',
    fields: {
      prospect_name: 'Jessica Torres',
      company_name: 'Torres Marketing',
      industry: 'Marketing',
      job_title: 'Director',
      email: 'jessica@torresmarketing.com',
      lead_score_grade: 'C',
      outreach_status: 'pending',
      lead_source: 'hunter',
      sourced_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
  },
  {
    id: 'prosp005',
    fields: {
      prospect_name: 'Carlos Mendez',
      company_name: 'Mendez HVAC',
      industry: 'Trades',
      job_title: 'Owner',
      email: 'carlos@mendezhvac.com',
      lead_score_grade: 'B',
      outreach_status: 'pending',
      lead_source: 'hunter',
      sourced_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  },
  {
    id: 'prosp006',
    fields: {
      prospect_name: 'Priya Sharma',
      company_name: 'Sharma Consultants',
      industry: 'Consulting',
      job_title: 'Founder',
      email: 'priya@sharmaconsultants.com',
      lead_score_grade: 'A',
      outreach_status: 'in_sequence',
      lead_source: 'website_chatbot',
      sourced_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
  },
]

// --- Fetch helpers ---

async function airtableFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`Airtable error ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

// sortField must be an actual field name that exists in the table.
// Clients: no reliable date field for sort — use default Airtable order (creation time, newest first).
// Prospects: sort by sourced_at desc.
async function fetchAllRecords(tableId, sortField = null) {
  let all = []
  let offset = null
  do {
    const url = new URL(`${BASE_URL}/${tableId}`)
    if (sortField) {
      url.searchParams.set('sort[0][field]', sortField)
      url.searchParams.set('sort[0][direction]', 'desc')
    }
    if (offset) url.searchParams.set('offset', offset)
    const data = await airtableFetch(url.toString())
    all = all.concat(data.records || [])
    offset = data.offset
  } while (offset)
  return all
}

// --- Exported functions ---

export async function fetchClients() {
  if (!API_KEY) {
    console.warn('[airtable] No API key — returning mock client data')
    return MOCK_CLIENTS
  }
  try {
    // No sort field — Airtable default order is creation time (newest first)
    return await fetchAllRecords(CLIENTS_TABLE, null)
  } catch (err) {
    console.error('[airtable] fetchClients failed:', err)
    return MOCK_CLIENTS
  }
}

export async function fetchProspects() {
  if (!API_KEY) {
    console.warn('[airtable] No API key — returning mock prospect data')
    return MOCK_PROSPECTS
  }
  try {
    // Sort by sourced_at desc — this field exists in the Prospects table
    return await fetchAllRecords(PROSPECTS_TABLE, 'sourced_at')
  } catch (err) {
    console.error('[airtable] fetchProspects failed:', err)
    return MOCK_PROSPECTS
  }
}

export async function fetchPipelineCounts() {
  const clients = await fetchClients()
  const counts = {}
  for (const c of clients) {
    const status = c.fields?.project_status || 'unknown'
    counts[status] = (counts[status] || 0) + 1
  }
  return counts
}

export async function fetchActionItems() {
  const clients = await fetchClients()
  const items = []
  for (const c of clients) {
    const name = c.fields?.company_name || 'Unknown'
    const status = c.fields?.project_status
    // Real Airtable project_status values from schema
    if (status === 'build.complete') {
      items.push({ id: c.id, label: `Review workflows for ${name}`, type: 'build_review' })
    } else if (status === 'qa.pass') {
      items.push({ id: c.id, label: `Activate ${name} — QA passed`, type: 'qa_pass' })
    } else if (status === 'activation.pending') {
      items.push({ id: c.id, label: `Activate ${name} — ready to go live`, type: 'activation' })
    } else if (status === 'onboarding.stalled') {
      items.push({ id: c.id, label: `Follow up: ${name} stalled on credentials`, type: 'stalled' })
    } else if (status === 'build.blocked') {
      items.push({ id: c.id, label: `Unblock build: ${name}`, type: 'blocked' })
    } else if (status === 'qa.fail') {
      items.push({ id: c.id, label: `QA failed — review fixes for ${name}`, type: 'qa_fail' })
    } else if (c.fields?.overdue_flagged_at) {
      items.push({ id: c.id, label: `Follow up: ${name} stalled`, type: 'overdue' })
    }
  }
  return items
}

export function countNewLeadsThisWeek(prospects) {
  const weekAgo = Date.now() - 7 * 86400000
  return prospects.filter((p) => {
    const d = p.fields?.sourced_at || p.fields?.created_at
    return d && new Date(d).getTime() > weekAgo
  }).length
}

export function countActiveClients(clients) {
  // Active = any status that represents real work in progress
  const active = new Set([
    'onboarding.in_progress', 'onboarding.stalled',
    'build.ready', 'build.in_progress', 'build.blocked', 'build.complete',
    'qa.in_progress', 'qa.pass', 'qa.fail',
    'activation.pending', 'live',
  ])
  return clients.filter((c) => active.has(c.fields?.project_status)).length
}


export function countHotLeads(prospects) {
  return prospects.filter((p) => ['A', 'B'].includes(p.fields?.lead_score_grade)).length
}
