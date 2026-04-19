import { SupportedWallet, WalletId, WalletManager, WalletProvider } from "@txnlab/use-wallet-react"
import { SnackbarProvider } from "notistack"
import { lazy, Suspense, useMemo } from "react"

import Home from "@/Home"
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs"

const DevScenarioPanel = lazy(() => import("@/components/DevScenarioPanel"))

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === "localnet") {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    { id: WalletId.LUTE, options: { siteName: "algoku" } },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = useMemo(
    () =>
      new WalletManager({
        wallets: supportedWallets,
        defaultNetwork: algodConfig.network,
        networks: {
          [algodConfig.network]: {
            algod: {
              baseServer: algodConfig.server,
              port: algodConfig.port,
              token: String(algodConfig.token),
            },
          },
        },
        options: {
          resetNetwork: true,
        },
      }),
    [algodConfig.network, algodConfig.server, algodConfig.port, algodConfig.token],
  )

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <Home />
        {import.meta.env.DEV ? (
          <Suspense fallback={null}>
            <DevScenarioPanel />
          </Suspense>
        ) : null}
      </WalletProvider>
    </SnackbarProvider>
  )
}
