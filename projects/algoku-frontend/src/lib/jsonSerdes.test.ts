import { describe, expect, it } from "vitest"

import { deserialize, serialize } from "@/lib/jsonSerdes"

describe("jsonSerdes", () => {
  it("round-trips BigInt", () => {
    const out = deserialize<{ id: bigint }>(serialize({ id: 9999999999999999n }))
    expect(out.id).toBe(9999999999999999n)
  })

  it("round-trips Uint8Array preserving bytes", () => {
    const bytes = new Uint8Array([0, 1, 254, 255, 128, 42])
    const out = deserialize<{ b: Uint8Array }>(serialize({ b: bytes }))
    expect(out.b).toBeInstanceOf(Uint8Array)
    expect(Array.from(out.b)).toEqual([0, 1, 254, 255, 128, 42])
  })

  it("round-trips a nested structure with mixed types", () => {
    const input = {
      assets: [
        { assetId: 1n, puzzle: new Uint8Array([1, 2, 3]) },
        { assetId: 2n, puzzle: new Uint8Array([4, 5, 6]) },
      ],
      label: "hello",
    }
    const out = deserialize<typeof input>(serialize(input))
    expect(out.assets[0].assetId).toBe(1n)
    expect(Array.from(out.assets[1].puzzle)).toEqual([4, 5, 6])
    expect(out.label).toBe("hello")
  })

  it("leaves plain values untouched", () => {
    const out = deserialize<{ a: number; b: string; c: boolean }>(serialize({ a: 1, b: "x", c: true }))
    expect(out).toEqual({ a: 1, b: "x", c: true })
  })
})
