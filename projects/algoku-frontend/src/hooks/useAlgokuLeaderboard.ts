import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { useMemo } from "react"

import { ALGOKU_UNIT_NAME } from "@/lib/assets"
import { LEADERBOARD_QUERY_KEY } from "@/lib/queryClient"
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs"

import { useAlgokuAppIdentity } from "@/hooks/useAlgokuAppIdentity"

export type LeaderboardEntry = {
  solver: string
  count: number
}

// Aggregates every algoku ASA minted by the canonical app on the current
// network, grouping by the `reserve` field (solver address). The indexer
// returns at most 1000 assets per page, so we paginate via next-token until
// the stream ends.
export function useAlgokuLeaderboard(): UseQueryResult<LeaderboardEntry[], Error> {
  const identity = useAlgokuAppIdentity()

  const algorand = useMemo(
    () =>
      AlgorandClient.fromConfig({
        algodConfig: getAlgodConfigFromViteEnvironment(),
        indexerConfig: getIndexerConfigFromViteEnvironment(),
      }),
    [],
  )

  return useQuery<LeaderboardEntry[], Error>({
    queryKey: [LEADERBOARD_QUERY_KEY, identity?.appId.toString() ?? ""],
    enabled: Boolean(identity),
    queryFn: async () => {
      if (!identity) return []
      const indexer = algorand.client.indexer
      const counts = new Map<string, number>()

      let nextToken: string | undefined
      do {
        const req = indexer
          .searchForAssets()
          .creator(identity.appAddress)
          .unit(ALGOKU_UNIT_NAME)
          .limit(1000)
        if (nextToken) req.nextToken(nextToken)
        const resp = await req.do()

        for (const asset of resp.assets ?? []) {
          const reserve = asset.params.reserve
          if (typeof reserve === "string" && reserve.length > 0) {
            counts.set(reserve, (counts.get(reserve) ?? 0) + 1)
          }
        }
        nextToken = resp.nextToken
      } while (nextToken)

      return Array.from(counts, ([solver, count]) => ({ solver, count })).sort(
        (a, b) => b.count - a.count || a.solver.localeCompare(b.solver),
      )
    },
  })
}
