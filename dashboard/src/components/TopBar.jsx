import { useState } from 'react'

function RefreshIcon({ spinning }) {
  return (
    <svg
      className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

export default function TopBar({ title, onRefresh, lastUpdated }) {
  const [spinning, setSpinning] = useState(false)

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const handleRefresh = () => {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 1000)
    if (onRefresh) onRefresh()
  }

  return (
    <header className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <h1 className="font-heading font-bold text-text-primary text-lg">{title}</h1>
      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-xs text-text-muted hidden sm:block">
            Updated {lastUpdated}
          </span>
        )}
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg text-primary hover:bg-primary-hover transition-colors"
          title="Refresh"
        >
          <RefreshIcon spinning={spinning} />
        </button>
        <span className="text-sm text-text-secondary hidden sm:block">{dateStr} · {timeStr}</span>
      </div>
    </header>
  )
}
