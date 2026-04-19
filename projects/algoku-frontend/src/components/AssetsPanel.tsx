import { ExternalLink } from "lucide-react"

import SudokuMini from "@/components/SudokuMini"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useOwnedAlgokuAssets } from "@/hooks/useOwnedAlgokuAssets"
import type { AlgokuAsset } from "@/lib/assets"
import { loraAssetUrl } from "@/utils/lora"

interface AssetsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: string | null
  network: string
}

const AssetsPanel = ({ open, onOpenChange, address, network }: AssetsPanelProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>my algoku nfts</SheetTitle>
          <SheetDescription>
            {address ? "puzzles you've solved and minted on-chain." : "connect a wallet to see your minted puzzles."}
          </SheetDescription>
        </SheetHeader>
        <AssetsPanelBody address={address} network={network} />
      </SheetContent>
    </Sheet>
  )
}

const AssetsPanelBody = ({ address, network }: { address: string | null; network: string }) => {
  const query = useOwnedAlgokuAssets()

  if (!address) return null

  if (query.isPending) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Spinner size="sm" />
        <span>loading assets…</span>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{query.error.message}</div>
    )
  }

  const assets = query.data ?? []
  if (assets.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">no algoku nfts yet — solve a puzzle and mint one.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {assets.map((a) => (
        <AssetCard key={a.assetId.toString()} asset={a} network={network} />
      ))}
    </div>
  )
}

const AssetCard = ({ asset, network }: { asset: AlgokuAsset; network: string }) => (
  <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
    <SudokuMini puzzle={asset.puzzle} solution={asset.solution} />
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-muted-foreground">asa {asset.assetId.toString()}</span>
      <a
        href={loraAssetUrl(network, asset.assetId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        lora <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  </div>
)

export default AssetsPanel
