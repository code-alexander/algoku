import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { useAlgokuAppIdentity } from "@/hooks/useAlgokuAppIdentity"
import { algorand } from "@/lib/algorand"
import { ALGOKU_UNIT_NAME } from "@/lib/assets"
import { LEADERBOARD_QUERY_KEY } from "@/lib/queryClient"

export type LeaderboardEntry = {
  solver: string
  count: number
}

// Cap client-side aggregation so the leaderboard stays fast as Algoku grows.
// 1000 per page × 10 pages = up to 10k most-recently-created assets, which
// is more than enough to find top solvers. Anything beyond that belongs
// server-side.
const PAGE_SIZE = 1000
const MAX_PAGES = 10

// Aggregates every algoku ASA minted by the canonical app on the current
// network, grouping by the `reserve` field (solver address). The indexer
// returns at most 1000 assets per page; we paginate up to MAX_PAGES and
// stop.
export function useAlgokuLeaderboard(): UseQueryResult<LeaderboardEntry[], Error> {
  const identity = useAlgokuAppIdentity()

  return useQuery<LeaderboardEntry[], Error>({
    queryKey: [LEADERBOARD_QUERY_KEY, identity?.appId.toString() ?? ""],
    enabled: Boolean(identity),
    queryFn: async () => {
      if (!identity) return []
      const indexer = algorand.client.indexer
      const counts = new Map<string, number>()

      let nextToken: string | undefined
      for (let page = 0; page < MAX_PAGES; page++) {
        const req = indexer.searchForAssets().creator(identity.appAddress).unit(ALGOKU_UNIT_NAME).limit(PAGE_SIZE)
        if (nextToken) req.nextToken(nextToken)
        const resp = await req.do()

        for (const asset of resp.assets ?? []) {
          const reserve = asset.params.reserve
          if (typeof reserve === "string" && reserve.length > 0) {
            counts.set(reserve, (counts.get(reserve) ?? 0) + 1)
          }
        }
        nextToken = resp.nextToken
        if (!nextToken) break
      }

      return Array.from(counts, ([solver, count]) => ({ solver, count })).sort(
        (a, b) => b.count - a.count || a.solver.localeCompare(b.solver),
      )
    },
  })
}
