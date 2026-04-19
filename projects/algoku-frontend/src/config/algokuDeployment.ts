import { getApplicationAddress } from "algosdk"

// Canonical Algoku app IDs per Algorand network. App IDs are public on-chain
// data, so committing them to the repo is expected. Fill these in after
// running `algokit project deploy <network>` from projects/algoku-contracts/
// and pasting the logged app_id here.
const DEPLOYED_APP_IDS: Record<string, bigint | undefined> = {
  testnet: 759044292n,
  mainnet: 3526906654n,
}

// Resolve the canonical Algoku app ID for a network.
//
// Precedence:
//   1. VITE_ALGOKU_APP_ID env override — useful on localnet (where the ID
//      changes on every reset) or when previewing an unreleased deployment.
//   2. The committed DEPLOYED_APP_IDS map.
//
// Returns undefined when no canonical app is known for the network. Callers
// should treat that as "app not yet deployed here" — on localnet the hook
// falls back to a per-wallet factory.deploy so dev still works.
export function getAlgokuAppId(network: string | undefined): bigint | undefined {
  const override = import.meta.env.VITE_ALGOKU_APP_ID as string | undefined
  if (override && override.trim() !== "") return BigInt(override)
  if (!network) return undefined
  return DEPLOYED_APP_IDS[network]
}

// Derive the app's escrow address from its ID. This is the `creator` every
// Algoku ASA will report on-chain (since the app itself mints via itxn),
// so it's what we feed into indexer queries like searchForAssets({ creator }).
export function getAlgokuAppAddress(appId: bigint): string {
  return getApplicationAddress(appId).toString()
}
