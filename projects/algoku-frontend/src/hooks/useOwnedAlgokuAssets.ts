import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { useWallet } from "@txnlab/use-wallet-react"

import { algorand } from "@/lib/algorand"
import { type AlgokuAsset, filterAlgokuAssets, type NormalizedAssetParams } from "@/lib/assets"
import { ASSETS_QUERY_KEY } from "@/lib/queryClient"

// Asset URLs with bytes 0x01..0x09 are not "printable UTF-8" by the indexer's
// rules, so `url` is undefined and the raw bytes come through `urlB64`.
// The pure mapper in lib/assets handles everything after this boundary.
export function useOwnedAlgokuAssets(): UseQueryResult<AlgokuAsset[], Error> {
  const { activeAddress } = useWallet()

  return useQuery<AlgokuAsset[], Error>({
    queryKey: [ASSETS_QUERY_KEY, activeAddress ?? ""],
    enabled: Boolean(activeAddress),
    queryFn: async () => {
      if (!activeAddress) return []
      const indexer = algorand.client.indexer

      const holdingsResp = await indexer.lookupAccountAssets(activeAddress).do()
      const holdings = holdingsResp.assets ?? []
      if (holdings.length === 0) return []

      // For each holding, fetch params + the acfg creation tx (for roundTime)
      // in parallel. Use allSettled so one flaky asset doesn't drop the rest
      // of the sidebar — failures are logged and skipped.
      const results = await Promise.allSettled(
        holdings.map(async (h) => {
          const [paramsResp, creationResp] = await Promise.all([
            indexer.lookupAssetByID(h.assetId).do(),
            indexer.searchForTransactions().assetID(h.assetId).txType("acfg").limit(1).do(),
          ])
          return { params: paramsResp, roundTime: creationResp.transactions?.[0]?.roundTime ?? null }
        }),
      )

      const normalized: NormalizedAssetParams[] = []
      for (const r of results) {
        if (r.status === "rejected") {
          console.warn("useOwnedAlgokuAssets: asset lookup failed", r.reason)
          continue
        }
        const { params, roundTime } = r.value
        normalized.push({
          assetId: params.asset.index,
          unitName: params.asset.params.unitName ?? "",
          url: params.asset.params.urlB64 ?? new Uint8Array(),
          creator: params.asset.params.creator,
          reserve: params.asset.params.reserve ?? "",
          createdAtUnix: roundTime,
        })
      }

      const assets = filterAlgokuAssets(normalized)
      // Most-recent-first — missing timestamps sink to the bottom.
      return assets.sort((a, b) => (b.createdAtUnix ?? -Infinity) - (a.createdAtUnix ?? -Infinity))
    },
  })
}
