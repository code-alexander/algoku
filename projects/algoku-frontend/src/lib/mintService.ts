// Service interface for the mint+claim flow. Decouples the hook from the
// AlgorandClient/AlgokuClient wallet machinery so failure scenarios can be
// reproduced deterministically (scripted impl for tests, scenario wrapper for
// in-browser fault injection in dev).

import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { OnSchemaBreak, OnUpdate } from "@algorandfoundation/algokit-utils/types/app"

import { AlgokuClient, AlgokuFactory } from "@/contracts/Algoku"
import { givensToMask } from "@/lib/sudoku"

const MINT_MBR_MICROALGO = 118_500
const APP_ACCOUNT_MIN_BALANCE = 100_000

export type DeployedApp = {
  appId: bigint
  appAddress: string
}

export type MintCall = {
  givens: Uint8Array
  solution: Uint8Array
}

export type MintResult = {
  assetId: bigint
  mintTxId: string
}

export type ExistingMint = {
  assetId: bigint
  reserve: string
}

export type ClaimResult = {
  claimTxId: string
}

export interface MintService {
  ensureDeployed(): Promise<DeployedApp>
  lookupExistingMint(solution: Uint8Array): Promise<ExistingMint | null>
  mint(call: MintCall): Promise<MintResult>
  claim(assetId: bigint): Promise<ClaimResult>
}

async function sha256Bytes(input: Uint8Array): Promise<Uint8Array> {
  const ab = new ArrayBuffer(input.byteLength)
  new Uint8Array(ab).set(input)
  const buf = await crypto.subtle.digest("SHA-256", ab)
  return new Uint8Array(buf)
}

function decodeUint64BE(bytes: Uint8Array): bigint {
  if (bytes.length !== 8) throw new Error(`expected 8 bytes, got ${bytes.length}`)
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getBigUint64(0)
}

export function createAlgorandMintService(args: { algorand: AlgorandClient; address: string; canonicalAppId?: bigint }): MintService {
  const { algorand, address, canonicalAppId } = args

  let cached: { client: AlgokuClient; app: DeployedApp } | null = null
  let inflight: Promise<{ client: AlgokuClient; app: DeployedApp }> | null = null

  async function getOrDeploy(): Promise<{ client: AlgokuClient; app: DeployedApp }> {
    if (cached) return cached
    if (inflight) return inflight
    inflight = (async () => {
      const factory = new AlgokuFactory({ defaultSender: address, algorand })
      // When a canonical app id is configured for the network (testnet/mainnet),
      // bind to it directly. Otherwise (localnet/dev) fall back to a per-wallet
      // factory.deploy so each developer gets their own app.
      let appClient: AlgokuClient
      if (canonicalAppId !== undefined) {
        appClient = factory.getAppClientById({ appId: canonicalAppId, defaultSender: address })
      } else {
        const deployed = await factory.deploy({
          onSchemaBreak: OnSchemaBreak.AppendApp,
          onUpdate: OnUpdate.AppendApp,
        })
        appClient = deployed.appClient
        const info = await algorand.account.getInformation(appClient.appAddress)
        if (info.balance.microAlgo < APP_ACCOUNT_MIN_BALANCE) {
          await algorand.send.payment({
            sender: address,
            receiver: appClient.appAddress,
            amount: APP_ACCOUNT_MIN_BALANCE.microAlgo(),
          })
        }
      }
      const result = {
        client: appClient,
        app: { appId: appClient.appId, appAddress: appClient.appAddress.toString() },
      }
      cached = result
      return result
    })().finally(() => {
      inflight = null
    })
    return inflight
  }

  return {
    async ensureDeployed() {
      const { app } = await getOrDeploy()
      return app
    },

    async lookupExistingMint(solution) {
      const { client } = await getOrDeploy()
      const key = await sha256Bytes(solution)
      let value: Uint8Array
      try {
        value = await client.appClient.getBoxValue(key)
      } catch {
        return null
      }
      const assetId = decodeUint64BE(value)
      try {
        const resp = await algorand.client.indexer.lookupAssetByID(assetId).do()
        return { assetId, reserve: resp.asset.params.reserve ?? "" }
      } catch {
        return { assetId, reserve: "" }
      }
    },

    async mint({ givens, solution }) {
      const { client } = await getOrDeploy()
      const puzzle = givensToMask(givens)
      const mbrPayment = await algorand.createTransaction.payment({
        sender: address,
        receiver: client.appAddress,
        amount: MINT_MBR_MICROALGO.microAlgo(),
      })
      const mintRes = await client.send.mint({
        args: { puzzle, solution, mbrPayment },
        extraFee: (20_000).microAlgo(),
      })
      if (mintRes.return === undefined) throw new Error("mint did not return an asset id")
      return {
        assetId: mintRes.return,
        mintTxId: mintRes.txIds[mintRes.txIds.length - 1],
      }
    },

    async claim(assetId) {
      const { client } = await getOrDeploy()
      const info = await algorand.account.getInformation(address)
      const optedIn = (info.assets ?? []).some((a) => a.assetId === assetId)
      if (optedIn) {
        const claimRes = await client.send.claim({
          args: { asset: assetId },
          extraFee: (1_000).microAlgo(),
        })
        return { claimTxId: claimRes.txIds[claimRes.txIds.length - 1] }
      }
      const optInTxn = await algorand.createTransaction.assetOptIn({
        sender: address,
        assetId,
      })
      const claimRes = await client
        .newGroup()
        .addTransaction(optInTxn)
        .claim({ args: { asset: assetId }, extraFee: (2_000).microAlgo() })
        .send()
      return { claimTxId: claimRes.txIds[claimRes.txIds.length - 1] }
    },
  }
}

// Stub implementation for tests. Each method either calls the provided script
// or throws "not provided" — callers explicitly opt into every call they make,
// so unexpected calls fail loudly.
export type MintServiceScripts = Partial<MintService>

export function createScriptedMintService(scripts: MintServiceScripts): MintService {
  const missing = (name: string): never => {
    throw new Error(`scripted MintService: ${name} not provided`)
  }
  return {
    ensureDeployed: scripts.ensureDeployed ?? (async () => missing("ensureDeployed")),
    lookupExistingMint: scripts.lookupExistingMint ?? (async () => missing("lookupExistingMint")),
    mint: scripts.mint ?? (async () => missing("mint")),
    claim: scripts.claim ?? (async () => missing("claim")),
  }
}
