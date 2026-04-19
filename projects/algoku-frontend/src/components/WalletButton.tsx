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

const WalletButton = ({ className, chipWhenDisconnected }: WalletButtonProps) => {
  const { activeAddress } = useWallet()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={activeAddress ? "outline" : "default"}
        onClick={() => setOpen(true)}
        className={cn(activeAddress ? undefined : chipWhenDisconnected, className)}
      >
        {activeAddress ? ellipseAddress(activeAddress) : "connect wallet"}
      </Button>
      <ConnectWallet openModal={open} closeModal={() => setOpen(false)} />
    </>
  )
}

export default WalletButton
