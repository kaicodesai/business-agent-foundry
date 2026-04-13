// Fetches the live PROJECT_OVERVIEW.md from the GitHub repo and parses
// the "## In Progress" section into action items for the dashboard.
//
// Uses the raw GitHub content URL so no auth is needed (public repo).
// Falls back to hardcoded items if the fetch fails.

const RAW_URL =
  'https://raw.githubusercontent.com/kaicodesai/business-agent-foundry/main/PROJECT_OVERVIEW.md'

const FALLBACK_ITEMS = [
  {
    id: 'po-1',
    label: 'Switch GitHub default branch to main (Settings → Branches)',
    type: 'ops',
  },
  { id: 'po-2', label: 'Invite Haris to n8n Cloud', type: 'ops' },
  {
    id: 'po-3',
    label: 'Clean 19 duplicate leads in Instantly dashboard',
    type: 'ops',
  },
  {
    id: 'po-4',
    label: 'Enable Instantly.ai campaign warmup manually',
    type: 'ops',
  },
]

function parseInProgress(markdown) {
  const start = markdown.indexOf('## In Progress')
  if (start === -1) return FALLBACK_ITEMS

  // Slice from the section header to the next ## header
  const next = markdown.indexOf('\n## ', start + 1)
  const section = next === -1 ? markdown.slice(start) : markdown.slice(start, next)

  const items = []
  for (const line of section.split('\n')) {
    // Match top-level bullet points only (not sub-bullets)
    const m = line.match(/^- (.+)$/)
    if (m) {
      const label = m[1]
        .trim()
        // Strip any markdown bold markers
        .replace(/\*\*/g, '')
      items.push({ id: `po-${items.length + 1}`, label, type: 'ops' })
    }
  }
  return items.length ? items : FALLBACK_ITEMS
}

export async function fetchInProgressItems() {
  try {
    const res = await fetch(RAW_URL)
    if (!res.ok) throw new Error(`${res.status}`)
    const text = await res.text()
    const items = parseInProgress(text)
    console.info(`[projectOverview] loaded ${items.length} In Progress items from GitHub`)
    return items
  } catch (err) {
    console.warn('[projectOverview] fetch failed — using fallback:', err.message)
    return FALLBACK_ITEMS
  }
}
