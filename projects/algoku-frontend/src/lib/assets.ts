import { parseAssetUrl } from "@/lib/sudoku"

export const ALGOKU_UNIT_NAME = "ALGOKU"
export const ALGOKU_URL_LENGTH = 92

export type AlgokuAsset = {
  assetId: bigint
  puzzle: Uint8Array
  solution: Uint8Array
  creator: string
  reserve: string
  createdAtUnix: number | null
}

// Normalized shape that the IO layer (indexer hook) must produce before
// handing params to the pure transforms below. Keeping the boundary explicit
// means the mapper does not need to know about indexer JSON quirks.
export type NormalizedAssetParams = {
  assetId: bigint
  unitName: string
  url: Uint8Array
  creator: string
  reserve: string
  createdAtUnix: number | null
}

export function tryParseAlgokuAsset(p: NormalizedAssetParams): AlgokuAsset | null {
  if (p.unitName !== ALGOKU_UNIT_NAME) return null
  if (p.url.length !== ALGOKU_URL_LENGTH) return null
  const { puzzle, solution } = parseAssetUrl(p.url)
  return {
    assetId: p.assetId,
    puzzle,
    solution,
    creator: p.creator,
    reserve: p.reserve,
    createdAtUnix: p.createdAtUnix,
  }
}

export function filterAlgokuAssets(inputs: readonly NormalizedAssetParams[]): AlgokuAsset[] {
  const out: AlgokuAsset[] = []
  for (const p of inputs) {
    const a = tryParseAlgokuAsset(p)
    if (a) out.push(a)
  }
  return out
}
