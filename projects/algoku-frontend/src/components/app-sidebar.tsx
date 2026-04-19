import { useWallet } from "@txnlab/use-wallet-react"
import * as React from "react"

import AssetCollapsible from "@/components/AssetCollapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import WalletButton from "@/components/WalletButton"
import { useAlgokuAppIdentity } from "@/hooks/useAlgokuAppIdentity"
import { type LeaderboardEntry, useAlgokuLeaderboard } from "@/hooks/useAlgokuLeaderboard"
import { useOwnedAlgokuAssets } from "@/hooks/useOwnedAlgokuAssets"
import { cn } from "@/lib/utils"
import { ellipseAddress } from "@/utils/ellipseAddress"

const NETWORK = import.meta.env.VITE_ALGOD_NETWORK ?? "localnet"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5 text-base font-semibold tracking-tight">algoku</div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>my algoku nfts</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2 px-2">
            <AssetsList />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>leaderboard</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <LeaderboardList />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <WalletButton className="w-full" />
      </SidebarFooter>
    </Sidebar>
  )
}

const LEADERBOARD_TOP_N = 10

const LeaderboardList = () => {
  const { activeAddress } = useWallet()
  const identity = useAlgokuAppIdentity()
  const query = useAlgokuLeaderboard()

  if (!identity) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">not available on this network.</p>
  }
  if (query.isPending) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <Spinner size="sm" />
        <span>loading…</span>
      </div>
    )
  }
  if (query.isError) {
    return <p className="px-2 py-1 text-xs text-destructive">{query.error.message}</p>
  }
  const all = query.data ?? []
  if (all.length === 0) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">no mints yet.</p>
  }
  const top = all.slice(0, LEADERBOARD_TOP_N)
  const youIdx = activeAddress ? all.findIndex((e) => e.solver === activeAddress) : -1
  const youInTop = youIdx >= 0 && youIdx < LEADERBOARD_TOP_N
  return (
    <div className="flex flex-col gap-0.5">
      {top.map((entry, i) => (
        <LeaderboardRow key={entry.solver} rank={i + 1} entry={entry} isYou={entry.solver === activeAddress} />
      ))}
      {youIdx >= 0 && !youInTop && (
        <div className="mt-1 border-t border-border pt-1">
          <LeaderboardRow rank={youIdx + 1} entry={all[youIdx]} isYou />
        </div>
      )}
    </div>
  )
}

const LeaderboardRow = ({ rank, entry, isYou }: { rank: number; entry: LeaderboardEntry; isYou: boolean }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-2 rounded-md px-2 py-1 font-mono text-xs",
      isYou && "bg-accent text-accent-foreground",
    )}
  >
    <span className="flex min-w-0 items-center gap-2">
      <span className="w-5 shrink-0 text-right text-muted-foreground">{rank}</span>
      <span className="truncate">{ellipseAddress(entry.solver, 4)}</span>
    </span>
    <span className="tabular-nums">{entry.count}</span>
  </div>
)

const AssetsList = () => {
  const { activeAddress } = useWallet()
  const query = useOwnedAlgokuAssets()

  if (!activeAddress) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">connect a wallet to see your nfts.</p>
  }
  if (query.isPending) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <Spinner size="sm" />
        <span>loading…</span>
      </div>
    )
  }
  if (query.isError) {
    return <p className="px-2 py-1 text-xs text-destructive">{query.error.message}</p>
  }
  const assets = query.data ?? []
  if (assets.length === 0) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">no nfts yet — solve a puzzle and mint.</p>
  }
  return (
    <>
      {assets.map((a) => (
        <AssetCollapsible key={a.assetId.toString()} asset={a} network={NETWORK} />
      ))}
    </>
  )
}
