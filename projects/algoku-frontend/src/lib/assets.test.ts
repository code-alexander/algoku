import { describe, expect, it } from "vitest"

import { ALGOKU_UNIT_NAME, ALGOKU_URL_LENGTH, filterAlgokuAssets, type NormalizedAssetParams, tryParseAlgokuAsset } from "@/lib/assets"
import { givensToMask } from "@/lib/sudoku"

// deterministic valid-shape solution (digits 1..9 cycling), good enough for
// transform tests — we are not validating sudoku rules here.
function makeSolution(): Uint8Array {
  const s = new Uint8Array(81)
  for (let i = 0; i < 81; i++) s[i] = (i % 9) + 1
  return s
}

function makeUrl(solution: Uint8Array, mask: Uint8Array): Uint8Array {
  const url = new Uint8Array(ALGOKU_URL_LENGTH)
  url.set(solution, 0)
  url.set(mask, 81)
  return url
}

function makeParams(overrides: Partial<NormalizedAssetParams> = {}): NormalizedAssetParams {
  const solution = makeSolution()
  const givens = new Uint8Array(81)
  givens[0] = solution[0]
  givens[40] = solution[40]
  const mask = givensToMask(givens)
  return {
    assetId: 123n,
    unitName: ALGOKU_UNIT_NAME,
    url: makeUrl(solution, mask),
    creator: "APPADDR",
    reserve: "USERADDR",
    ...overrides,
  }
}

describe("tryParseAlgokuAsset", () => {
  it("parses puzzle + solution from a well-formed ASA url", () => {
    const params = makeParams()
    const asset = tryParseAlgokuAsset(params)
    expect(asset).not.toBeNull()
    expect(asset!.assetId).toBe(123n)
    expect(asset!.puzzle.length).toBe(81)
    expect(asset!.solution.length).toBe(81)
    expect(asset!.puzzle[0]).toBe(asset!.solution[0])
    expect(asset!.puzzle[1]).toBe(0)
    expect(asset!.puzzle[40]).toBe(asset!.solution[40])
  })

  it("returns null when unitName is not ALGOKU", () => {
    expect(tryParseAlgokuAsset(makeParams({ unitName: "OTHER" }))).toBeNull()
  })

  it("returns null when url has wrong length", () => {
    expect(tryParseAlgokuAsset(makeParams({ url: new Uint8Array(10) }))).toBeNull()
  })
})

describe("filterAlgokuAssets", () => {
  it("keeps only matching params and preserves order", () => {
    const a = makeParams({ assetId: 1n })
    const b = makeParams({ assetId: 2n, unitName: "OTHER" })
    const c = makeParams({ assetId: 3n })
    const out = filterAlgokuAssets([a, b, c])
    expect(out.map((x) => x.assetId)).toEqual([1n, 3n])
  })
})
