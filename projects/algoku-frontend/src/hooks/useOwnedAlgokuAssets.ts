import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { useWallet } from "@txnlab/use-wallet-react"
import { useMemo } from "react"

import { type AlgokuAsset, filterAlgokuAssets, type NormalizedAssetParams } from "@/lib/assets"
import { ASSETS_QUERY_KEY } from "@/lib/queryClient"
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs"

// Asset URLs with bytes 0x01..0x09 are not "printable UTF-8" by the indexer's
// rules, so `url` is undefined and the raw bytes come through `urlB64`.
// The pure mapper in lib/assets handles everything after this boundary.
export function useOwnedAlgokuAssets(): UseQueryResult<AlgokuAsset[], Error> {
  const { activeAddress } = useWallet()

  const algorand = useMemo(
    () =>
      AlgorandClient.fromConfig({
        algodConfig: getAlgodConfigFromViteEnvironment(),
        indexerConfig: getIndexerConfigFromViteEnvironment(),
      }),
    [],
  )

  return useQuery<AlgokuAsset[], Error>({
    queryKey: [ASSETS_QUERY_KEY, activeAddress ?? ""],
    enabled: Boolean(activeAddress),
    queryFn: async () => {
      if (!activeAddress) return []
      const indexer = algorand.client.indexer

      const holdingsResp = await indexer.lookupAccountAssets(activeAddress).do()
      const holdings = holdingsResp.assets ?? []
      if (holdings.length === 0) return []

      const responses = await Promise.all(holdings.map((h) => indexer.lookupAssetByID(h.assetId).do()))

      const normalized: NormalizedAssetParams[] = responses.map((r) => ({
        assetId: r.asset.index,
        unitName: r.asset.params.unitName ?? "",
        url: r.asset.params.urlB64 ?? new Uint8Array(),
        creator: r.asset.params.creator,
        reserve: r.asset.params.reserve ?? "",
      }))

      return filterAlgokuAssets(normalized)
    },
  })
}
