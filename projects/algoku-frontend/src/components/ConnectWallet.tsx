import { useWallet, Wallet, WalletId } from "@txnlab/use-wallet-react"
import { Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ellipseAddress } from "@/utils/ellipseAddress"
import { getAlgodConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs"

interface ConnectWalletProps {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletProps) => {
  const { wallets, activeAddress } = useWallet()
  const algoConfig = getAlgodConfigFromViteEnvironment()
  const [connectingId, setConnectingId] = useState<WalletId | null>(null)

  const networkName = useMemo(() => (algoConfig.network === "" ? "localnet" : algoConfig.network.toLowerCase()), [algoConfig.network])

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  // Some wallets (e.g. Lute, WalletConnect) leave `connect()` pending when the user
  // dismisses their prompt, so we clear the spinner whenever the modal closes.
  useEffect(() => {
    if (!openModal) setConnectingId(null)
  }, [openModal])

  const handleConnect = async (wallet: Wallet) => {
    try {
      setConnectingId(wallet.id)
      await wallet.connect()
    } finally {
      setConnectingId(null)
    }
  }

  const handleLogout = async () => {
    const active = wallets?.find((w) => w.isActive)
    if (active) {
      await active.disconnect()
    } else {
      // Required for logout/cleanup when switching networks.
      localStorage.removeItem("@txnlab/use-wallet:v3")
      window.location.reload()
    }
  }

  return (
    <Dialog open={openModal} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>select wallet provider</DialogTitle>
        </DialogHeader>

        {activeAddress && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">address:</span>{" "}
              <a
                href={`https://lora.algokit.io/${networkName}/account/${activeAddress}/`}
                target="_blank"
                rel="noreferrer"
                className="font-mono underline decoration-dotted underline-offset-4"
              >
                {ellipseAddress(activeAddress)}
              </a>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">network:</span> {networkName}
            </div>
            <Separator />
          </div>
        )}

        {!activeAddress && (
          <div className="flex flex-col gap-2 py-2">
            {wallets?.map((wallet) => {
              const isConnecting = connectingId === wallet.id
              const isBusy = connectingId !== null
              return (
                <Button
                  key={wallet.id}
                  variant="outline"
                  data-test-id={`${wallet.id}-connect`}
                  onClick={() => handleConnect(wallet)}
                  disabled={isBusy}
                  className="justify-start gap-3"
                >
                  {!isKmd(wallet) && (
                    <img alt={`wallet icon for ${wallet.metadata.name}`} src={wallet.metadata.icon} className="h-6 w-6 object-contain" />
                  )}
                  <span>{isKmd(wallet) ? "localnet wallet" : wallet.metadata.name}</span>
                  {isConnecting && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                </Button>
              )
            })}
          </div>
        )}

        <DialogFooter>
          {activeAddress && (
            <Button variant="destructive" onClick={handleLogout} data-test-id="logout">
              logout
            </Button>
          )}
          <Button variant="outline" onClick={closeModal} data-test-id="close-wallet-modal">
            close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConnectWallet
