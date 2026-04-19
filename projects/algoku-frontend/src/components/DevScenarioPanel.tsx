// Floating dev-only panel for fault injection. Only mounted when DEV is true.

import { Bug, X } from "lucide-react"
import { useState, useSyncExternalStore } from "react"

import { type FailTarget, getScenarioConfig, setScenarioConfig, subscribeScenario } from "@/lib/devScenario"

const TARGETS: { value: FailTarget; label: string }[] = [
  { value: "none", label: "no failure" },
  { value: "deploy", label: "fail deploy" },
  { value: "lookup", label: "fail lookup" },
  { value: "mint", label: "fail mint" },
  { value: "claim", label: "fail claim" },
]

const DevScenarioPanel = () => {
  const config = useSyncExternalStore(subscribeScenario, getScenarioConfig, getScenarioConfig)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="open dev scenario panel"
        className="fixed bottom-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md hover:text-foreground"
      >
        <Bug className="h-4 w-4" />
        {config.failNext !== "none" ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500" /> : null}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium">
          <Bug className="h-4 w-4" />
          dev scenarios
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="close" className="opacity-60 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">fault injection</span>
        <select
          value={config.failNext}
          onChange={(e) => setScenarioConfig({ failNext: e.target.value as FailTarget })}
          className="rounded border border-input bg-background px-2 py-1 text-sm"
        >
          {TARGETS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">error message (optional)</span>
        <input
          type="text"
          value={config.failMessage}
          onChange={(e) => setScenarioConfig({ failMessage: e.target.value })}
          placeholder="e.g. Confirmation Failed(4100)"
          className="rounded border border-input bg-background px-2 py-1 text-sm"
        />
      </label>

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={config.consumeOnFire} onChange={(e) => setScenarioConfig({ consumeOnFire: e.target.checked })} />
        reset to "no failure" after firing once
      </label>

      <p className="text-xs text-muted-foreground">
        the next matching MintService call will throw. use this to reproduce wallet errors (e.g. 4100), claim-after-mint failures, etc.
      </p>
    </div>
  )
}

export default DevScenarioPanel
