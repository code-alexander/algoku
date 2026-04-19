import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { QueryClient } from "@tanstack/react-query"

import { deserialize, serialize } from "@/lib/jsonSerdes"

export const ASSETS_QUERY_KEY = "assets"

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}

export function createAlgokuPersister() {
  return createSyncStoragePersister({
    storage: typeof window === "undefined" ? undefined : window.localStorage,
    key: "algoku.query-cache.v1",
    serialize,
    deserialize,
  })
}

// Only persist the "my assets" query — leaderboard / other reads should stay
// in-memory so they revalidate on each session.
export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === ASSETS_QUERY_KEY
}
