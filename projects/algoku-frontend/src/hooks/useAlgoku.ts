import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { OnSchemaBreak, OnUpdate } from "@algorandfoundation/algokit-utils/types/app"
import { useWallet } from "@txnlab/use-wallet-react"
import { useCallback, useMemo, useRef, useState } from "react"

import { AlgokuClient, AlgokuFactory } from "@/contracts/Algoku"
import { givensToMask } from "@/lib/sudoku"
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs"

// MBR for one box (sha256 key + 8-byte ASA id) plus the inner-created ASA.
// Mirrors MINT_MBR_MICROALGO in projects/algoku-contracts/tests/algoku_client_test.py.
const MINT_MBR_MICROALGO = 118_500
// Base MBR so the app account can exist and hold the ASA it creates before claim transfers it out.
const APP_ACCOUNT_MIN_BALANCE = 100_000

export type MintPhase = "minting" | "claiming"

export type MintResult = {
  appId: bigint
  assetId: bigint
  mintTxId: string
  claimTxId: string
}

export function useAlgoku() {
  const { transactionSigner, activeAddress } = useWallet()

  const algorand = useMemo(() => {
    const client = AlgorandClient.fromConfig({
      algodConfig: getAlgodConfigFromViteEnvironment(),
      indexerConfig: getIndexerConfigFromViteEnvironment(),
    })
    if (transactionSigner) client.setDefaultSigner(transactionSigner)
    return client
  }, [transactionSigner])

  const [appClient, setAppClient] = useState<AlgokuClient | null>(null)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<MintPhase | null>(null)
  const deployingRef = useRef<Promise<AlgokuClient> | null>(null)

  const getOrDeploy = useCallback(async (): Promise<AlgokuClient> => {
    if (appClient) return appClient
    if (deployingRef.current) return deployingRef.current
    if (!activeAddress) throw new Error("Connect a wallet before submitting.")

    const factory = new AlgokuFactory({ defaultSender: activeAddress, algorand })
    const promise = factory
      .deploy({
        onSchemaBreak: OnSchemaBreak.AppendApp,
        onUpdate: OnUpdate.AppendApp,
      })
      .then(async ({ appClient: c }) => {
        const info = await algorand.account.getInformation(c.appAddress)
        if (info.balance.microAlgo < APP_ACCOUNT_MIN_BALANCE) {
          await algorand.send.payment({
            sender: activeAddress,
            receiver: c.appAddress,
            amount: APP_ACCOUNT_MIN_BALANCE.microAlgo(),
          })
        }
        setAppClient(c)
        return c
      })
      .finally(() => {
        deployingRef.current = null
      })
    deployingRef.current = promise
    return promise
  }, [activeAddress, algorand, appClient])

  const mintAndClaim = useCallback(
    async (givens: Uint8Array, solution: Uint8Array): Promise<MintResult> => {
      setBusy(true)
      setPhase("minting")
      try {
        const client = await getOrDeploy()
        if (!activeAddress) throw new Error("Connect a wallet before submitting.")

        const puzzle = givensToMask(givens)

        const mbrPayment = await algorand.createTransaction.payment({
          sender: activeAddress,
          receiver: client.appAddress,
          amount: MINT_MBR_MICROALGO.microAlgo(),
        })

        const mintRes = await client.send.mint({
          args: { puzzle, solution, mbrPayment },
          extraFee: (20_000).microAlgo(),
        })
        const assetId = mintRes.return
        if (assetId === undefined) throw new Error("mint did not return an asset id")
        const mintTxId = mintRes.txIds[mintRes.txIds.length - 1]

        setPhase("claiming")
        const optInTxn = await algorand.createTransaction.assetOptIn({
          sender: activeAddress,
          assetId,
        })

        const claimRes = await client
          .newGroup()
          .addTransaction(optInTxn)
          .claim({ args: { asset: assetId }, extraFee: (2_000).microAlgo() })
          .send()
        const claimTxId = claimRes.txIds[claimRes.txIds.length - 1]

        return { appId: client.appId, assetId, mintTxId, claimTxId }
      } finally {
        setBusy(false)
        setPhase(null)
      }
    },
    [activeAddress, algorand, getOrDeploy],
  )

  return {
    mintAndClaim,
    busy,
    phase,
  }
}
