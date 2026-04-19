import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { useWallet } from "@txnlab/use-wallet-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { withScenarioFailures } from "@/lib/devScenario"
import { type MintPhase, type MintState, runMintAndClaim, runResumeFromPending, runRetryClaim } from "@/lib/mintFlow"
import { createAlgorandMintService, type MintService } from "@/lib/mintService"
import { clearPendingMint, type PendingMint } from "@/lib/pendingMint"
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs"

export type { MintPhase, MintState } from "@/lib/mintFlow"

export function useAlgoku() {
  const { transactionSigner, activeAddress } = useWallet()
  const [state, setState] = useState<MintState>({ kind: "idle" })

  // The client is config-only — rebuilding it when the signer changes would
  // discard the MintService's deploy-cache + inflight dedup, which can drop
  // in-flight transactions across a wallet swap.
  const algorand = useMemo(
    () =>
      AlgorandClient.fromConfig({
        algodConfig: getAlgodConfigFromViteEnvironment(),
        indexerConfig: getIndexerConfigFromViteEnvironment(),
      }),
    [],
  )

  useEffect(() => {
    if (transactionSigner) algorand.setDefaultSigner(transactionSigner)
  }, [algorand, transactionSigner])

  const service: MintService | null = useMemo(() => {
    if (!activeAddress) return null
    const real = createAlgorandMintService({ algorand, address: activeAddress })
    return import.meta.env.DEV ? withScenarioFailures(real) : real
  }, [algorand, activeAddress])

  const mintAndClaim = useCallback(
    async (givens: Uint8Array, solution: Uint8Array): Promise<void> => {
      if (!service || !activeAddress) {
        setState({ kind: "error", phase: "mint", message: "Connect a wallet before submitting." })
        return
      }
      await runMintAndClaim({ service, address: activeAddress, setState, givens, solution })
    },
    [service, activeAddress],
  )

  const retryClaim = useCallback(async (): Promise<void> => {
    if (!service || !activeAddress) return
    await runRetryClaim({ service, address: activeAddress, setState, current: state })
  }, [service, activeAddress, state])

  const resumeFromPending = useCallback(
    async (pending: PendingMint): Promise<void> => {
      if (!service || !activeAddress) return
      await runResumeFromPending({ service, address: activeAddress, setState, pending })
    },
    [service, activeAddress],
  )

  const dismiss = useCallback(
    (opts?: { clearPending?: boolean }): void => {
      if (opts?.clearPending) clearPendingMint(activeAddress)
      setState({ kind: "idle" })
    },
    [activeAddress],
  )

  const busy = state.kind === "minting" || state.kind === "claiming"
  const phase: MintPhase | null = state.kind === "minting" ? "minting" : state.kind === "claiming" ? "claiming" : null

  return {
    state,
    mintAndClaim,
    retryClaim,
    resumeFromPending,
    dismiss,
    busy,
    phase,
  }
}
