import { useMemo } from "react"

import { getAlgokuAppAddress, getAlgokuAppId } from "@/config/algokuDeployment"

export type AlgokuAppIdentity = {
  appId: bigint
  appAddress: string
}

// Returns the canonical Algoku app's ID and derived escrow address for the
// current network, or null if no deployment is configured. Consumers like the
// leaderboard use `appAddress` as the `creator` filter when paginating every
// algoku ASA via the indexer.
export function useAlgokuAppIdentity(): AlgokuAppIdentity | null {
  return useMemo(() => {
    const appId = getAlgokuAppId(import.meta.env.VITE_ALGOD_NETWORK)
    if (appId === undefined) return null
    return { appId, appAddress: getAlgokuAppAddress(appId) }
  }, [])
}
