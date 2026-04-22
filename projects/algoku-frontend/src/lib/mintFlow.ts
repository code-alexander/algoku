// Pure orchestration for the mint+claim flow. Takes a MintService and a
// setState callback so it can be exercised without React or a real wallet —
// see mintFlow.test.ts for scenario coverage.

import type { MintService } from "@/lib/mintService"
import { clearPendingMint, type PendingMint, writePendingMint } from "@/lib/pendingMint"

export type MintPhase = "minting" | "claiming"

export type MintState =
  | { kind: "idle" }
  | { kind: "minting" }
  | { kind: "awaiting-claim"; assetId: bigint; mintTxId: string }
  | { kind: "claiming"; assetId: bigint; mintTxId: string }
  | { kind: "done"; appId: bigint; assetId: bigint; mintTxId: string; claimTxId: string }
  | { kind: "error"; phase: "mint" | "claim"; message: string; assetId?: bigint; mintTxId?: string }

export type SetState = (s: MintState) => void

function bytesToHex(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += b.toString(16).padStart(2, "0")
  return s
}

async function solutionHashHex(solution: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new Uint8Array(solution))
  return bytesToHex(new Uint8Array(buf))
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function runMintAndClaim(args: {
  service: MintService
  address: string
  setState: SetState
  givens: Uint8Array
  solution: Uint8Array
}): Promise<void> {
  const { service, address, setState, givens, solution } = args

  setState({ kind: "minting" })

  let appId: bigint
  let assetId: bigint
  let mintTxId: string

  try {
    const app = await service.ensureDeployed()
    appId = app.appId

    const existing = await service.lookupExistingMint(solution)
    if (existing !== null) {
      if (existing.reserve !== "" && existing.reserve !== address) {
        throw new Error("This solution was already minted by another wallet.")
      }
      assetId = existing.assetId
      mintTxId = ""
    } else {
      const res = await service.mint({ givens, solution })
      assetId = res.assetId
      mintTxId = res.mintTxId
    }

    writePendingMint(address, {
      appId: appId.toString(),
      assetId: assetId.toString(),
      mintTxId,
      solutionHash: await solutionHashHex(solution),
      createdAt: Date.now(),
    })
    setState({ kind: "awaiting-claim", assetId, mintTxId })
  } catch (err) {
    setState({ kind: "error", phase: "mint", message: errMessage(err) })
    return
  }

  await runClaim({ service, address, setState, appId, assetId, mintTxId })
}

export async function runClaim(args: {
  service: MintService
  address: string
  setState: SetState
  appId: bigint
  assetId: bigint
  mintTxId: string
}): Promise<void> {
  const { service, address, setState, appId, assetId, mintTxId } = args
  setState({ kind: "claiming", assetId, mintTxId })
  try {
    const { claimTxId } = await service.claim(assetId)
    clearPendingMint(address)
    setState({ kind: "done", appId, assetId, mintTxId, claimTxId })
  } catch (err) {
    setState({
      kind: "error",
      phase: "claim",
      message: errMessage(err),
      assetId,
      mintTxId,
    })
  }
}

export async function runRetryClaim(args: {
  service: MintService
  address: string
  setState: SetState
  current: MintState
}): Promise<void> {
  const { service, address, setState, current } = args
  let assetId: bigint | undefined
  let mintTxId = ""

  if (current.kind === "awaiting-claim" || current.kind === "claiming") {
    assetId = current.assetId
    mintTxId = current.mintTxId
  } else if (current.kind === "error" && current.phase === "claim" && current.assetId !== undefined) {
    assetId = current.assetId
    mintTxId = current.mintTxId ?? ""
  }
  if (assetId === undefined) return

  let appId: bigint
  try {
    const app = await service.ensureDeployed()
    appId = app.appId
  } catch (err) {
    setState({ kind: "error", phase: "claim", message: errMessage(err), assetId, mintTxId })
    return
  }
  await runClaim({ service, address, setState, appId, assetId, mintTxId })
}

export async function runResumeFromPending(args: {
  service: MintService
  address: string
  setState: SetState
  pending: PendingMint
}): Promise<void> {
  const { service, address, setState, pending } = args
  const assetId = BigInt(pending.assetId)
  const appId = BigInt(pending.appId)
  const mintTxId = pending.mintTxId

  setState({ kind: "awaiting-claim", assetId, mintTxId })

  try {
    await service.ensureDeployed()
  } catch (err) {
    setState({ kind: "error", phase: "claim", message: errMessage(err), assetId, mintTxId })
    return
  }
  await runClaim({ service, address, setState, appId, assetId, mintTxId })
}
