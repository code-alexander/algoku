import { beforeEach, describe, expect, it } from "vitest"

import { type MintState, runMintAndClaim, runResumeFromPending, runRetryClaim } from "@/lib/mintFlow"
import { createScriptedMintService, type MintServiceScripts } from "@/lib/mintService"
import { clearPendingMint, readPendingMint } from "@/lib/pendingMint"

const ADDR = "TESTADDR"
const OTHER_ADDR = "OTHERADDR"
const APP = { appId: 1n, appAddress: "APPADDR" }

const givens = new Uint8Array(81)
const solution = new Uint8Array(81).fill(1)

function recorder() {
  const states: MintState[] = []
  return {
    setState: (s: MintState) => states.push(s),
    states,
    kinds: () => states.map((s) => s.kind),
    last: () => states[states.length - 1],
  }
}

function service(scripts: MintServiceScripts) {
  return createScriptedMintService(scripts)
}

beforeEach(() => {
  clearPendingMint(ADDR)
  clearPendingMint(OTHER_ADDR)
})

describe("runMintAndClaim", () => {
  it("happy path: minting → awaiting-claim → claiming → done", async () => {
    const r = recorder()
    await runMintAndClaim({
      service: service({
        ensureDeployed: async () => APP,
        lookupExistingMint: async () => null,
        mint: async () => ({ assetId: 42n, mintTxId: "TX_MINT" }),
        claim: async () => ({ claimTxId: "TX_CLAIM" }),
      }),
      address: ADDR,
      setState: r.setState,
      givens,
      solution,
    })

    expect(r.kinds()).toEqual(["minting", "awaiting-claim", "claiming", "done"])
    expect(r.last()).toMatchObject({ kind: "done", appId: 1n, assetId: 42n, mintTxId: "TX_MINT", claimTxId: "TX_CLAIM" })
    expect(readPendingMint(ADDR)).toBeNull()
  })

  it("mint fails: error/mint, no pending stored", async () => {
    const r = recorder()
    await runMintAndClaim({
      service: service({
        ensureDeployed: async () => APP,
        lookupExistingMint: async () => null,
        mint: async () => {
          throw new Error("Confirmation Failed(4100)")
        },
      }),
      address: ADDR,
      setState: r.setState,
      givens,
      solution,
    })

    expect(r.kinds()).toEqual(["minting", "error"])
    expect(r.last()).toMatchObject({ kind: "error", phase: "mint", message: "Confirmation Failed(4100)" })
    expect(readPendingMint(ADDR)).toBeNull()
  })

  it("claim fails: error/claim carries assetId+mintTxId, pending persisted for recovery", async () => {
    const r = recorder()
    await runMintAndClaim({
      service: service({
        ensureDeployed: async () => APP,
        lookupExistingMint: async () => null,
        mint: async () => ({ assetId: 99n, mintTxId: "TX_MINT" }),
        claim: async () => {
          throw new Error("user rejected claim")
        },
      }),
      address: ADDR,
      setState: r.setState,
      givens,
      solution,
    })

    expect(r.kinds()).toEqual(["minting", "awaiting-claim", "claiming", "error"])
    expect(r.last()).toMatchObject({
      kind: "error",
      phase: "claim",
      message: "user rejected claim",
      assetId: 99n,
      mintTxId: "TX_MINT",
    })
    expect(readPendingMint(ADDR)).toMatchObject({
      assetId: "99",
      mintTxId: "TX_MINT",
      appId: "1",
    })
  })

  it("recovers when prior mint already in box (owned by us): skips mint, claims existing asset", async () => {
    const r = recorder()
    let mintCalled = false
    await runMintAndClaim({
      service: service({
        ensureDeployed: async () => APP,
        lookupExistingMint: async () => ({ assetId: 7n, reserve: ADDR }),
        mint: async () => {
          mintCalled = true
          return { assetId: 0n, mintTxId: "" }
        },
        claim: async () => ({ claimTxId: "TX_CLAIM" }),
      }),
      address: ADDR,
      setState: r.setState,
      givens,
      solution,
    })

    expect(mintCalled).toBe(false)
    expect(r.last()).toMatchObject({ kind: "done", assetId: 7n, mintTxId: "", claimTxId: "TX_CLAIM" })
  })

  it("rejects when solution was already minted by another wallet", async () => {
    const r = recorder()
    await runMintAndClaim({
      service: service({
        ensureDeployed: async () => APP,
        lookupExistingMint: async () => ({ assetId: 7n, reserve: OTHER_ADDR }),
      }),
      address: ADDR,
      setState: r.setState,
      givens,
      solution,
    })

    expect(r.last()).toMatchObject({
      kind: "error",
      phase: "mint",
      message: expect.stringContaining("another wallet"),
    })
    expect(readPendingMint(ADDR)).toBeNull()
  })
})

describe("runRetryClaim", () => {
  it("from error/claim: re-runs claim with carried assetId, transitions to done", async () => {
    const r = recorder()
    const current: MintState = {
      kind: "error",
      phase: "claim",
      message: "previous failure",
      assetId: 42n,
      mintTxId: "TX_MINT",
    }
    await runRetryClaim({
      service: service({
        ensureDeployed: async () => APP,
        claim: async () => ({ claimTxId: "TX_CLAIM" }),
      }),
      address: ADDR,
      setState: r.setState,
      current,
    })

    expect(r.kinds()).toEqual(["claiming", "done"])
    expect(r.last()).toMatchObject({ kind: "done", assetId: 42n, claimTxId: "TX_CLAIM" })
  })

  it("from error/claim: claim fails again, state stays as error/claim with assetId preserved", async () => {
    const r = recorder()
    const current: MintState = {
      kind: "error",
      phase: "claim",
      message: "previous failure",
      assetId: 42n,
      mintTxId: "TX_MINT",
    }
    await runRetryClaim({
      service: service({
        ensureDeployed: async () => APP,
        claim: async () => {
          throw new Error("still rejecting")
        },
      }),
      address: ADDR,
      setState: r.setState,
      current,
    })

    expect(r.last()).toMatchObject({
      kind: "error",
      phase: "claim",
      message: "still rejecting",
      assetId: 42n,
    })
  })

  it("noops when current state has no assetId to retry", async () => {
    const r = recorder()
    await runRetryClaim({
      service: service({}),
      address: ADDR,
      setState: r.setState,
      current: { kind: "idle" },
    })
    expect(r.states).toHaveLength(0)
  })
})

describe("runResumeFromPending", () => {
  it("hydrates from pending and runs claim", async () => {
    const r = recorder()
    await runResumeFromPending({
      service: service({
        ensureDeployed: async () => APP,
        claim: async () => ({ claimTxId: "TX_CLAIM" }),
      }),
      address: ADDR,
      setState: r.setState,
      pending: {
        appId: "1",
        assetId: "55",
        mintTxId: "TX_MINT",
        solutionHash: "deadbeef",
        createdAt: 0,
      },
    })

    expect(r.kinds()).toEqual(["awaiting-claim", "claiming", "done"])
    expect(r.last()).toMatchObject({ kind: "done", appId: 1n, assetId: 55n, claimTxId: "TX_CLAIM" })
  })
})
