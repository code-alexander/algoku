import { useQueryClient } from "@tanstack/react-query"
import { useWallet } from "@txnlab/use-wallet-react"
import { AlertTriangle, Check, CheckCircle2, ExternalLink, RefreshCw, X, XCircle } from "lucide-react"
import { useSnackbar } from "notistack"
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import NumberPad from "@/components/NumberPad"
import { SiteHeader } from "@/components/site-header"
import SudokuBoard from "@/components/SudokuBoard"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { type MintState, useAlgoku } from "@/hooks/useAlgoku"
import { useSudokuState } from "@/hooks/useSudokuState"
import { type PendingMint, readPendingMint, subscribePendingMint } from "@/lib/pendingMint"
import { ASSETS_QUERY_KEY } from "@/lib/queryClient"
import { findConflicts, generatePuzzle, solve } from "@/lib/sudoku"
import { cn } from "@/lib/utils"
import { loraAssetUrl, loraTxUrl } from "@/utils/lora"

const NETWORK = import.meta.env.VITE_ALGOD_NETWORK ?? "localnet"

const EMERALD_CHIP =
  "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"

const Home = () => {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const [conflicts, setConflicts] = useState<ReadonlySet<number>>(() => new Set())
  const [checkPassed, setCheckPassed] = useState(false)

  const { givens, entries, selectedIndex, isFull, loadPuzzle, setSelected, moveSelection, setCell, clearEntries, fillEntries, toSolution } =
    useSudokuState(generatePuzzle().puzzle)

  const { state, mintAndClaim, retryClaim, resumeFromPending, dismiss, busy, phase } = useAlgoku()

  const selectedIsEditable = selectedIndex !== null && givens[selectedIndex] === 0

  // pending is sourced from localStorage; subscribe so the banner updates
  // exactly when the mint flow writes/clears it (same tab via notify, other
  // tabs via the `storage` event).
  const [pending, setPending] = useState<PendingMint | null>(() => readPendingMint(activeAddress))
  useEffect(() => {
    setPending(readPendingMint(activeAddress))
    return subscribePendingMint(() => {
      setPending(readPendingMint(activeAddress))
    })
  }, [activeAddress])

  // Once an in-flight claim hydrates from localStorage, pending recovery is
  // owned by the hook state — suppress the banner.
  const showRecoveryBanner =
    pending !== null &&
    activeAddress !== null &&
    activeAddress !== undefined &&
    (state.kind === "idle" || (state.kind === "error" && state.phase === "mint"))

  // Handlers need to read the latest mint state without listing `state` in
  // every useCallback dep list (which would thrash memoized children). Ref
  // is updated synchronously each render.
  const stateRef = useRef(state)
  stateRef.current = state

  const dismissIfTerminal = useCallback(() => {
    const s = stateRef.current
    if (s.kind === "done" || (s.kind === "error" && s.phase === "mint")) {
      dismiss()
    }
  }, [dismiss])

  const handleSetCell = useCallback(
    (index: number, value: number | null) => {
      setConflicts((prev) => (prev.size > 0 ? new Set() : prev))
      setCheckPassed(false)
      dismissIfTerminal()
      setCell(index, value)
    },
    [dismissIfTerminal, setCell],
  )

  const handleNewPuzzle = useCallback(() => {
    setConflicts(new Set())
    setCheckPassed(false)
    dismissIfTerminal()
    loadPuzzle(generatePuzzle().puzzle)
  }, [dismissIfTerminal, loadPuzzle])

  const handleReset = useCallback(() => {
    setConflicts(new Set())
    setCheckPassed(false)
    dismissIfTerminal()
    clearEntries()
  }, [dismissIfTerminal, clearEntries])

  // Global cmd+ctrl+enter auto-solve. Handler body reads latest state/givens
  // via ref so we subscribe once, not on every puzzle change.
  const solveShortcutRef = useRef<(e: KeyboardEvent) => void>(() => {})
  solveShortcutRef.current = (e: KeyboardEvent) => {
    if (!(e.metaKey && e.ctrlKey && e.key === "Enter")) return
    e.preventDefault()
    const solved = solve(givens)
    if (!solved) {
      enqueueSnackbar("could not solve current puzzle", { variant: "error" })
      return
    }
    fillEntries(solved)
    setConflicts(new Set())
    setCheckPassed(false)
    dismissIfTerminal()
  }
  useEffect(() => {
    const listener = (e: KeyboardEvent) => solveShortcutRef.current(e)
    document.addEventListener("keydown", listener)
    return () => document.removeEventListener("keydown", listener)
  }, [])

  // Refresh owned-assets cache after a successful claim so the sidebar updates.
  useEffect(() => {
    if (state.kind === "done") {
      queryClient.invalidateQueries({ queryKey: [ASSETS_QUERY_KEY, activeAddress ?? ""] })
    }
  }, [state.kind, activeAddress, queryClient])

  const handleCheck = useCallback(() => {
    const grid = toSolution()
    const found = findConflicts(grid)
    if (found.size > 0) {
      setConflicts(found)
      setCheckPassed(false)
      return
    }
    setConflicts(new Set())
    setCheckPassed(isFull)
  }, [toSolution, isFull])

  const handleMint = useCallback(() => {
    void mintAndClaim(givens, toSolution())
  }, [mintAndClaim, givens, toSolution])

  const handleRetryClaim = useCallback(() => {
    void retryClaim()
  }, [retryClaim])

  const handleResume = useCallback(() => {
    if (pending) void resumeFromPending(pending)
  }, [pending, resumeFromPending])

  const handleDiscardPending = useCallback(() => {
    dismiss({ clearPending: true })
  }, [dismiss])

  const handleDismissError = useCallback(() => {
    dismiss()
  }, [dismiss])

  const handleNumberPress = useCallback(
    (v: number | null) => {
      if (selectedIndex !== null) handleSetCell(selectedIndex, v)
    },
    [selectedIndex, handleSetCell],
  )

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "22rem",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-4 lg:max-w-lg 2xl:max-w-xl">
          <SudokuBoard
            givens={givens}
            entries={entries}
            selectedIndex={selectedIndex}
            conflicts={conflicts}
            onSelect={setSelected}
            onMove={moveSelection}
            onSetCell={handleSetCell}
          />

          <NumberPad onPress={handleNumberPress} disabled={!selectedIsEditable} />

          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={handleNewPuzzle} disabled={busy} className="flex-1">
              new puzzle
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={busy} className="flex-1">
              reset
            </Button>
            {checkPassed ? (
              <Button disabled aria-label="solved" className={cn("flex-1 disabled:opacity-100", EMERALD_CHIP)}>
                <Check className="mr-1 h-4 w-4" />
                solved
              </Button>
            ) : (
              <Button onClick={handleCheck} disabled={busy} className={cn("flex-1", EMERALD_CHIP)}>
                check
              </Button>
            )}
          </div>

          <ActionArea
            state={state}
            busy={busy}
            phase={phase}
            checkPassed={checkPassed}
            activeAddress={activeAddress ?? null}
            showRecoveryBanner={showRecoveryBanner}
            pending={pending}
            onMint={handleMint}
            onRetryClaim={handleRetryClaim}
            onResume={handleResume}
            onDiscardPending={handleDiscardPending}
            onDismissError={handleDismissError}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

type ActionAreaProps = {
  state: MintState
  busy: boolean
  phase: "minting" | "claiming" | null
  checkPassed: boolean
  activeAddress: string | null
  showRecoveryBanner: boolean
  pending: PendingMint | null
  onMint: () => void
  onRetryClaim: () => void
  onResume: () => void
  onDiscardPending: () => void
  onDismissError: () => void
}

const ActionArea = ({
  state,
  busy,
  phase,
  checkPassed,
  activeAddress,
  showRecoveryBanner,
  pending,
  onMint,
  onRetryClaim,
  onResume,
  onDiscardPending,
  onDismissError,
}: ActionAreaProps) => {
  if (state.kind === "done") {
    return <SuccessCard appId={state.appId} assetId={state.assetId} mintTxId={state.mintTxId} claimTxId={state.claimTxId} />
  }

  if (busy) {
    return (
      <Button disabled className={cn("w-full", EMERALD_CHIP)}>
        <Spinner size="sm" />
        <span className="ml-2">{phase === "claiming" ? "claiming nft…" : "minting…"}</span>
      </Button>
    )
  }

  if (state.kind === "awaiting-claim") {
    // Transient — usually superseded by the next "claiming" tick. Render a
    // claim button as a manual fallback in case the auto-chain didn't fire.
    return (
      <Button onClick={onRetryClaim} className={cn("w-full", EMERALD_CHIP)}>
        claim nft
      </Button>
    )
  }

  if (state.kind === "error") {
    if (state.phase === "claim") {
      return (
        <ClaimErrorCard
          message={state.message}
          assetId={state.assetId}
          mintTxId={state.mintTxId ?? ""}
          onRetry={onRetryClaim}
          onDismiss={onDismissError}
        />
      )
    }
    return <MintErrorCard message={state.message} onRetry={onMint} onDismiss={onDismissError} />
  }

  // state.kind === "idle"
  if (showRecoveryBanner && pending) {
    return <RecoveryBanner pending={pending} onResume={onResume} onDiscard={onDiscardPending} />
  }

  if (checkPassed && activeAddress) {
    return (
      <Button onClick={onMint} className={cn("w-full", EMERALD_CHIP)}>
        mint nft
      </Button>
    )
  }
  if (checkPassed && !activeAddress) {
    return <p className="text-sm text-muted-foreground">looks good — connect a wallet to mint.</p>
  }
  if (!activeAddress) {
    return <p className="text-sm text-muted-foreground">connect a wallet to enable minting.</p>
  }
  return null
}

const SuccessCard = ({ appId, assetId, mintTxId, claimTxId }: { appId: bigint; assetId: bigint; mintTxId: string; claimTxId: string }) => (
  <div className="flex w-full flex-col gap-2 rounded-md border border-border bg-card p-4">
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-5 w-5 text-primary" />
      <span className="font-medium">nft minted &amp; claimed</span>
    </div>
    <div className="text-sm text-muted-foreground">
      app {appId.toString()} · asa {assetId.toString()}
    </div>
    <div className="flex flex-col gap-1">
      <a
        href={loraAssetUrl(NETWORK, assetId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        view asset on lora <ExternalLink className="h-3 w-3" />
      </a>
      {mintTxId ? (
        <a
          href={loraTxUrl(NETWORK, mintTxId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          mint transaction <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
      <a
        href={loraTxUrl(NETWORK, claimTxId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        claim transaction <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  </div>
)

const MintErrorCard = ({ message, onRetry, onDismiss }: { message: string; onRetry: () => void; onDismiss: () => void }) => (
  <div className="flex w-full flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
    <div className="flex items-start gap-2">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 break-all">mint failed: {message}</div>
    </div>
    <div className="flex gap-2">
      <Button onClick={onRetry} variant="outline" className="flex-1">
        <RefreshCw className="mr-1 h-3 w-3" />
        try again
      </Button>
      <Button onClick={onDismiss} variant="ghost" className="flex-1">
        dismiss
      </Button>
    </div>
  </div>
)

const ClaimErrorCard = ({
  message,
  assetId,
  mintTxId,
  onRetry,
  onDismiss,
}: {
  message: string
  assetId?: bigint
  mintTxId: string
  onRetry: () => void
  onDismiss: () => void
}) => (
  <div className="flex w-full flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <div className="font-medium">mint succeeded — claim failed</div>
        <div className="break-all opacity-80">{message}</div>
        {assetId !== undefined ? (
          <div className="mt-1 flex flex-col gap-0.5 text-xs">
            <a
              href={loraAssetUrl(NETWORK, assetId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              asa {assetId.toString()} <ExternalLink className="h-3 w-3" />
            </a>
            {mintTxId ? (
              <a
                href={loraTxUrl(NETWORK, mintTxId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                mint transaction <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
    <div className="flex gap-2">
      <Button onClick={onRetry} variant="outline" className="flex-1">
        <RefreshCw className="mr-1 h-3 w-3" />
        retry claim
      </Button>
      <Button onClick={onDismiss} variant="ghost" className="flex-1">
        later
      </Button>
    </div>
  </div>
)

const RecoveryBanner = ({ pending, onResume, onDiscard }: { pending: PendingMint; onResume: () => void; onDiscard: () => void }) => {
  const assetId = BigInt(pending.assetId)
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <div className="font-medium">unclaimed nft</div>
          <div className="text-xs opacity-80">mint succeeded but claim didn&apos;t finish. you can complete it now.</div>
          <a
            href={loraAssetUrl(NETWORK, assetId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs hover:underline"
          >
            asa {assetId.toString()} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <button type="button" onClick={onDiscard} aria-label="discard recovery" className="rounded p-1 opacity-60 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      </div>
      <Button onClick={onResume} className={cn("w-full", EMERALD_CHIP)}>
        claim now
      </Button>
    </div>
  )
}

export default Home
