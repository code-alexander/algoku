// Dev-only fault injection: a tiny pub/sub config that the scenario service
// consults on each MintService method call. The DevScenarioPanel mutates this;
// the scenario service reads it. Disabled in production builds.

import type { MintService } from "@/lib/mintService"

export type FailTarget = "none" | "deploy" | "lookup" | "mint" | "claim"

export type ScenarioConfig = {
  failNext: FailTarget
  failMessage: string
  consumeOnFire: boolean
}

const initial: ScenarioConfig = {
  failNext: "none",
  failMessage: "",
  consumeOnFire: true,
}

let config: ScenarioConfig = initial
const subs = new Set<() => void>()

export function getScenarioConfig(): ScenarioConfig {
  return config
}

export function setScenarioConfig(patch: Partial<ScenarioConfig>): void {
  config = { ...config, ...patch }
  subs.forEach((cb) => cb())
}

export function subscribeScenario(cb: () => void): () => void {
  subs.add(cb)
  return () => {
    subs.delete(cb)
  }
}

function maybeFail(target: FailTarget): void {
  if (config.failNext !== target) return
  const message = config.failMessage || `Simulated failure (${target})`
  if (config.consumeOnFire) setScenarioConfig({ failNext: "none" })
  throw new Error(message)
}

export function withScenarioFailures(real: MintService): MintService {
  return {
    async ensureDeployed() {
      maybeFail("deploy")
      return real.ensureDeployed()
    },
    async lookupExistingMint(solution) {
      maybeFail("lookup")
      return real.lookupExistingMint(solution)
    },
    async mint(call) {
      maybeFail("mint")
      return real.mint(call)
    },
    async claim(assetId) {
      maybeFail("claim")
      return real.claim(assetId)
    },
  }
}
