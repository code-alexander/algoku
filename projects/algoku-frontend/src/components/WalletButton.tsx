import { useWallet } from "@txnlab/use-wallet-react"
import { useState } from "react"

import ConnectWallet from "@/components/ConnectWallet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ellipseAddress } from "@/utils/ellipseAddress"

// Shared wallet trigger + modal. Rendered in SiteHeader and in the sidebar
// footer so the wallet stays reachable whether the sidebar is open or hidden.
// Internal modal state means the two instances don't need to share state.
interface WalletButtonProps {
  className?: string
  chipWhenDisconnected?: string
}

const EMERALD_CHIP =
  "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"

const WalletButton = ({ className, chipWhenDisconnected }: WalletButtonProps) => {
  const { activeAddress } = useWallet()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(activeAddress ? undefined : (chipWhenDisconnected ?? EMERALD_CHIP), className)}
      >
        {activeAddress ? ellipseAddress(activeAddress) : "connect wallet"}
      </Button>
      <ConnectWallet openModal={open} closeModal={() => setOpen(false)} />
    </>
  )
}

export default WalletButton
