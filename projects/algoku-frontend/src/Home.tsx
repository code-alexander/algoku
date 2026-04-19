import { useQueryClient } from "@tanstack/react-query"
import { useWallet } from "@txnlab/use-wallet-react"
import { Check, CheckCircle2, ExternalLink, Layers, XCircle } from "lucide-react"
import { useSnackbar } from "notistack"
import { useEffect, useState } from "react"

import AssetsPanel from "@/components/AssetsPanel"
import ConnectWallet from "@/components/ConnectWallet"
import { ModeToggle } from "@/components/ModeToggle"
import NumberPad from "@/components/NumberPad"
import SudokuBoard from "@/components/SudokuBoard"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { type MintResult, useAlgoku } from "@/hooks/useAlgoku"
import { useSudokuState } from "@/hooks/useSudokuState"
import { ASSETS_QUERY_KEY } from "@/lib/queryClient"
import { findConflicts, generatePuzzle, solve } from "@/lib/sudoku"
import { ellipseAddress } from "@/utils/ellipseAddress"
import { loraAssetUrl, loraTxUrl } from "@/utils/lora"

type SubmitResult = { kind: "minted"; result: MintResult } | { kind: "error"; message: string }

const NETWORK = import.meta.env.VITE_ALGOD_NETWORK ?? "localnet"

const Home = () => {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const [walletOpen, setWalletOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const [conflicts, setConflicts] = useState<ReadonlySet<number>>(() => new Set())
  const [checkPassed, setCheckPassed] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)

  const { givens, entries, selectedIndex, isFull, loadPuzzle, setSelected, moveSelection, setCell, clearEntries, fillEntries, toSolution } =
    useSudokuState(generatePuzzle().puzzle)

  const { mintAndClaim, busy, phase } = useAlgoku()

  const selectedIsEditable = selectedIndex !== null && givens[selectedIndex] === 0

  const clearFlow = () => {
    setCheckPassed(false)
    setResult(null)
  }

  const handleSetCell = (index: number, value: number | null) => {
    if (conflicts.size > 0) setConflicts(new Set())
    clearFlow()
    setCell(index, value)
  }

  const handleNewPuzzle = () => {
    setConflicts(new Set())
    clearFlow()
    loadPuzzle(generatePuzzle().puzzle)
  }

  const handleReset = () => {
    setConflicts(new Set())
    clearFlow()
    clearEntries()
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        const solved = solve(givens)
        if (solved) {
          fillEntries(solved)
          setConflicts(new Set())
          clearFlow()
        } else {
          enqueueSnackbar("could not solve current puzzle", { variant: "error" })
        }
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [givens, fillEntries, enqueueSnackbar])

  const handleCheck = () => {
    const grid = toSolution()
    const found = findConflicts(grid)
    if (found.size > 0) {
      setConflicts(found)
      setCheckPassed(false)
      return
    }
    setConflicts(new Set())
    setCheckPassed(isFull)
  }

  const handleMint = async () => {
    const solution = toSolution()
    try {
      const minted = await mintAndClaim(givens, solution)
      setResult({ kind: "minted", result: minted })
      setCheckPassed(false)
      queryClient.invalidateQueries({ queryKey: [ASSETS_QUERY_KEY, activeAddress ?? ""] })
    } catch (err) {
      setResult({ kind: "error", message: (err as Error).message })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">algoku</h1>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {activeAddress ? (
            <Button variant="outline" onClick={() => setAssetsOpen(true)} aria-label="my nfts">
              <Layers className="h-4 w-4" />
            </Button>
          ) : null}
          <Button variant={activeAddress ? "outline" : "default"} onClick={() => setWalletOpen(true)}>
            {activeAddress ? ellipseAddress(activeAddress) : "connect wallet"}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-8">
        <SudokuBoard
          givens={givens}
          entries={entries}
          selectedIndex={selectedIndex}
          conflicts={conflicts}
          onSelect={setSelected}
          onMove={moveSelection}
          onSetCell={handleSetCell}
        />

        <NumberPad onPress={(v) => selectedIndex !== null && handleSetCell(selectedIndex, v)} disabled={!selectedIsEditable} />

        <div className="flex w-full gap-2">
          <Button variant="outline" onClick={handleNewPuzzle} className="flex-1">
            new puzzle
          </Button>
          <Button variant="outline" onClick={handleReset} className="flex-1">
            reset
          </Button>
          {checkPassed ? (
            <Button
              disabled
              aria-label="solved"
              className="flex-1 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-500 disabled:opacity-100 dark:border-emerald-500 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-500"
            >
              <Check className="mr-1 h-4 w-4" />
              solved
            </Button>
          ) : (
            <Button onClick={handleCheck} disabled={busy} className="flex-1">
              check
            </Button>
          )}
        </div>

        {result ? (
          <ResultCard result={result} network={NETWORK} />
        ) : busy ? (
          <Button disabled className="w-full">
            <Spinner size="sm" />
            <span className="ml-2">{phase === "claiming" ? "claiming nft…" : "minting…"}</span>
          </Button>
        ) : checkPassed && activeAddress ? (
          <Button onClick={handleMint} className="w-full">
            mint nft
          </Button>
        ) : checkPassed && !activeAddress ? (
          <p className="text-sm text-muted-foreground">looks good — connect a wallet to mint.</p>
        ) : !activeAddress ? (
          <p className="text-sm text-muted-foreground">connect a wallet to enable minting.</p>
        ) : null}
      </main>

      <ConnectWallet openModal={walletOpen} closeModal={() => setWalletOpen(false)} />
      <AssetsPanel open={assetsOpen} onOpenChange={setAssetsOpen} address={activeAddress ?? null} network={NETWORK} />
    </div>
  )
}

const ResultCard = ({ result, network }: { result: SubmitResult; network: string }) => {
  if (result.kind === "error") {
    return (
      <div className="flex w-full items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <XCircle className="h-4 w-4 shrink-0" />
        <span className="break-all">mint failed: {result.message}</span>
      </div>
    )
  }
  const { assetId, mintTxId, claimTxId, appId } = result.result
  return (
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
          href={loraAssetUrl(network, assetId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          view asset on lora <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={loraTxUrl(network, mintTxId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          mint transaction <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={loraTxUrl(network, claimTxId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          claim transaction <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

export default Home
