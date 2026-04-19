import { describe, expect, it } from "vitest"

import { loraAssetUrl, loraTxUrl } from "@/utils/lora"

describe("loraTxUrl", () => {
  it("builds a transaction url for the given network and tx id", () => {
    expect(loraTxUrl("localnet", "ABC123")).toBe("https://lora.algokit.io/localnet/transaction/ABC123")
    expect(loraTxUrl("testnet", "XYZ")).toBe("https://lora.algokit.io/testnet/transaction/XYZ")
    expect(loraTxUrl("mainnet", "ZZ")).toBe("https://lora.algokit.io/mainnet/transaction/ZZ")
  })
})

describe("loraAssetUrl", () => {
  it("renders bigint asset ids in base 10", () => {
    expect(loraAssetUrl("localnet", 1234n)).toBe("https://lora.algokit.io/localnet/asset/1234")
  })

  it("accepts plain numbers", () => {
    expect(loraAssetUrl("testnet", 42)).toBe("https://lora.algokit.io/testnet/asset/42")
  })

  it("preserves large bigint ids without precision loss", () => {
    const id = 9_007_199_254_740_993n // 2^53 + 1, beyond Number.MAX_SAFE_INTEGER
    expect(loraAssetUrl("mainnet", id)).toBe(`https://lora.algokit.io/mainnet/asset/${id.toString()}`)
  })
})
