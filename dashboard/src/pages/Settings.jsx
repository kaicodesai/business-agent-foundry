import TopBar from '../components/TopBar'

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-success" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-error" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
    </svg>
  )
}

function EnvRow({ label, envKey, description, value }) {
  const isSet = !!value && value !== ''
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{label}</span>
          {isSet ? <CheckIcon /> : <XIcon />}
        </div>
        <p className="text-xs text-text-muted mt-0.5 font-mono">{envKey}</p>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      <div className="ml-4 flex-shrink-0">
        {isSet ? (
          <span className="text-xs text-success font-medium">Set</span>
        ) : (
          <span className="text-xs text-error font-medium">Missing</span>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-gray-50">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  )
}

export default function Settings() {
  const env = {
    VITE_AIRTABLE_BASE_ID: import.meta.env.VITE_AIRTABLE_BASE_ID,
    VITE_AIRTABLE_CLIENTS_TABLE: import.meta.env.VITE_AIRTABLE_CLIENTS_TABLE,
    VITE_AIRTABLE_PROSPECTS_TABLE: import.meta.env.VITE_AIRTABLE_PROSPECTS_TABLE,
    VITE_AIRTABLE_API_KEY: import.meta.env.VITE_AIRTABLE_API_KEY,
    VITE_N8N_BASE_URL: import.meta.env.VITE_N8N_BASE_URL,
    VITE_N8N_API_KEY: import.meta.env.VITE_N8N_API_KEY,
  }

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Settings" />
      <main className="flex-1 p-6 max-w-3xl">
        <div className="space-y-6">

          {/* Environment Variables */}
          <SectionCard title="Environment Variables">
            <EnvRow
              label="Airtable Base ID"
              envKey="VITE_AIRTABLE_BASE_ID"
              description="Airtable base — appMLHig3CN7WW0iW"
              value={env.VITE_AIRTABLE_BASE_ID}
            />
            <EnvRow
              label="Clients Table ID"
              envKey="VITE_AIRTABLE_CLIENTS_TABLE"
              description="Clients table ID"
              value={env.VITE_AIRTABLE_CLIENTS_TABLE}
            />
            <EnvRow
              label="Prospects Table ID"
              envKey="VITE_AIRTABLE_PROSPECTS_TABLE"
              description="Prospects table ID"
              value={env.VITE_AIRTABLE_PROSPECTS_TABLE}
            />
            <EnvRow
              label="Airtable API Key"
              envKey="VITE_AIRTABLE_API_KEY"
              description="Your Airtable personal access token — fill in dashboard/.env"
              value={env.VITE_AIRTABLE_API_KEY}
            />
            <EnvRow
              label="n8n Base URL"
              envKey="VITE_N8N_BASE_URL"
              description="n8n Cloud instance URL"
              value={env.VITE_N8N_BASE_URL}
            />
            <EnvRow
              label="n8n API Key"
              envKey="VITE_N8N_API_KEY"
              description="From pa-n8n-api credential in n8n — fill in dashboard/.env"
              value={env.VITE_N8N_API_KEY}
            />
          </SectionCard>

          {/* Quick Setup */}
          <SectionCard title="Quick Setup">
            <div className="py-4 space-y-3">
              <p className="text-sm text-text-secondary">
                To connect live data, add these two values to <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">dashboard/.env</code>:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-text-primary space-y-1 border border-border">
                <p className="text-text-muted"># Your Airtable personal access token (airtable.com → Account → API)</p>
                <p>VITE_AIRTABLE_API_KEY=<span className="text-error">your_pat_here</span></p>
                <p className="mt-2 text-text-muted"># n8n API key — from pa-n8n-api credential in n8n</p>
                <p>VITE_N8N_API_KEY=<span className="text-error">your_n8n_key_here</span></p>
              </div>
              <p className="text-xs text-text-muted">
                After updating, restart with: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">./scripts/start-dashboard.sh</code>
              </p>
            </div>
          </SectionCard>

          {/* System Info */}
          <SectionCard title="System Info">
            <div className="py-4 space-y-2">
              {[
                ['Business', 'Phoenix Automation'],
                ['Airtable Base', 'appMLHig3CN7WW0iW'],
                ['n8n Instance', 'kaiashley.app.n8n.cloud'],
                ['Workflows', '14 registered'],
                ['Version', 'KAI OS v1.0 — Dashboard redesign'],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-text-muted uppercase tracking-wide font-medium">{label}</span>
                  <span className="text-sm text-text-primary font-medium">{val}</span>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>
      </main>
    </div>
  )
}
