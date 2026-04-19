// Persists an in-flight mint so the user can recover the claim step after a
// browser refresh, wallet disconnect, or claim-phase failure. The on-chain
// asset already has reserve == solver's address, so anyone can complete the
// claim — we just need to remember the assetId.

const KEY_PREFIX = "algoku:pending:"

export type PendingMint = {
  appId: string
  assetId: string
  mintTxId: string
  solutionHash: string
  createdAt: number
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readPendingMint(address: string | null | undefined): PendingMint | null {
  if (!address) return null
  const ls = storage()
  if (!ls) return null
  try {
    const raw = ls.getItem(KEY_PREFIX + address)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingMint>
    if (
      typeof parsed.appId !== "string" ||
      typeof parsed.assetId !== "string" ||
      typeof parsed.mintTxId !== "string" ||
      typeof parsed.solutionHash !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null
    }
    return parsed as PendingMint
  } catch {
    return null
  }
}

export function writePendingMint(address: string, pending: PendingMint): void {
  const ls = storage()
  if (!ls) return
  try {
    ls.setItem(KEY_PREFIX + address, JSON.stringify(pending))
  } catch {
    // Quota / private mode — recovery just won't survive a refresh.
  }
}

export function clearPendingMint(address: string | null | undefined): void {
  if (!address) return
  const ls = storage()
  if (!ls) return
  try {
    ls.removeItem(KEY_PREFIX + address)
  } catch {
    // ignore
  }
}
