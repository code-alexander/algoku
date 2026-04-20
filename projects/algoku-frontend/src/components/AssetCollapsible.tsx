import { ChevronDown, ExternalLink } from "lucide-react"

import SudokuMini from "@/components/SudokuMini"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { AlgokuAsset } from "@/lib/assets"
import { formatMintDate } from "@/utils/formatMintDate"
import { loraAssetUrl } from "@/utils/lora"

interface AssetCollapsibleProps {
  asset: AlgokuAsset
  network: string
}

// Pure presentational — collapsed trigger is a compact one-liner; expanding
// reveals the mini-grid + a lora link. Matches the spacecake aesthetic by
// leaning on theme tokens with literal emerald accents for the lora link.
const AssetCollapsible = ({ asset, network }: AssetCollapsibleProps) => {
  const date = formatMintDate(asset.createdAtUnix)

  return (
    <Collapsible>
      <Card className="py-0">
        <CardContent className="p-0">
          <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
            <span className="truncate font-mono text-xs">asset {asset.assetId.toString()}</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{date}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-2 p-3 pt-0">
            <SudokuMini puzzle={asset.puzzle} solution={asset.solution} />
            <a
              href={loraAssetUrl(network, asset.assetId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline dark:text-emerald-400"
            >
              lora <ExternalLink className="h-3 w-3" />
            </a>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  )
}

export default AssetCollapsible
