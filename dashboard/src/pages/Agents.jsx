import { useState, useEffect } from 'react'
import TopBar from '../components/TopBar'
import { fetchWorkflows, fetchLastExecution, mergeWorkflowData, timeAgo, WORKFLOW_REGISTRY } from '../lib/n8n'

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
    </svg>
  )
}

function WorkflowCard({ workflow, lastExec }) {
  const borderColor = workflow.active
    ? 'border-l-success'
    : workflow.found === false
    ? 'border-l-gray-300'
    : 'border-l-gray-300'

  const n8nUrl = `https://kaiashley.app.n8n.cloud/workflow/${workflow.id}`

  return (
    <div
      className={`bg-surface border border-border border-l-4 ${borderColor} rounded-card shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200 p-4 flex flex-col gap-3`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading font-semibold text-text-primary text-sm leading-tight flex-1">
          {workflow.name}
        </h3>
        <span className={workflow.active ? 'badge-active' : 'badge-inactive'}>
          <span className={`w-1.5 h-1.5 rounded-full ${workflow.active ? 'bg-success' : 'bg-gray-400'}`} />
          {workflow.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary leading-relaxed">{workflow.description}</p>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span>Last run: {lastExec ? timeAgo(lastExec.startedAt) : 'unknown'}</span>
          {workflow.nodes > 0 && (
            <span className="hidden sm:block">{workflow.nodes} nodes</span>
          )}
        </div>
        <a
          href={n8nUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View <ExternalLinkIcon />
        </a>
      </div>
    </div>
  )
}

export default function Agents() {
  const [workflows, setWorkflows] = useState([])
  const [executions, setExecutions] = useState({})
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const liveWf = await fetchWorkflows()
    const merged = mergeWorkflowData(liveWf)
    setWorkflows(merged)

    // Fetch last execution for each workflow (in parallel, best-effort)
    const execResults = {}
    await Promise.all(
      merged.map(async (wf) => {
        const exec = await fetchLastExecution(wf.id)
        if (exec) execResults[wf.id] = exec
      })
    )
    setExecutions(execResults)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activeCount = workflows.filter((w) => w.active).length
  const inactiveCount = workflows.length - activeCount

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Agents" onRefresh={load} />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {/* Summary bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-sm text-text-secondary">{activeCount} active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="text-sm text-text-secondary">{inactiveCount} inactive</span>
          </div>
          <span className="ml-auto text-xs text-text-muted">
            {workflows.length} workflows total
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {workflows.map((wf) => (
              <WorkflowCard key={wf.id} workflow={wf} lastExec={executions[wf.id]} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
