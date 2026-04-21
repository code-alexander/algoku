import { describe, expect, it } from "vitest"

import {
  type Difficulty,
  findConflicts,
  generatePuzzle,
  givensToMask,
  gridToUint8Array,
  isValidSolution,
  MAX_CLUES,
  MIN_CLUES,
  parseAssetUrl,
  parsePuzzle,
  solve,
} from "@/lib/sudoku"

// These are the same 10 grids the on-chain contract test suite uses — if the
// TS validator ever disagrees with the AVM implementation for any of them,
// that's a regression.
const VALID_GRIDS = [
  "953168742862734951417952836746893125281645397395271468138529674574386219629417583",
  "256734198891265374347198652514683729728519436963427581135942867689371245472856913",
  "964532178187694235235817964629451783573986412841273596416728359352169847798345621",
  "123675948456982371789314562964157283517238496832496157271849635395761824648523719",
  "123745689456819237789263514897452361632198745541637928315924876274586193968371452",
]

const INVALID_GRIDS = [
  "953168742862734951417952836746893125281645397395271468138529674574386219629417582",
  "256734198891265374347198652414683729728519436963427581135942867689371245472856913",
  "964532178187594235235817964629451783573986412841273596416728359352169847798345621",
  "423675948456982371789314562964157283517238496832496157271849635395761824648523719",
  "723745689456819237789263514897452361632198745541637928315924876274586193968371452",
]

const asBytes = (s: string) => Uint8Array.from(s, (c) => Number(c))

describe("isValidSolution", () => {
  it.each(VALID_GRIDS)("accepts valid grid %s", (grid) => {
    expect(isValidSolution(asBytes(grid))).toBe(true)
  })

  it.each(INVALID_GRIDS)("rejects invalid grid %s", (grid) => {
    expect(isValidSolution(asBytes(grid))).toBe(false)
  })

  it("rejects grids that are not 81 bytes", () => {
    expect(isValidSolution(new Uint8Array(80))).toBe(false)
    expect(isValidSolution(new Uint8Array(82))).toBe(false)
  })

  it("rejects grids with out-of-range digits", () => {
    const grid = asBytes(VALID_GRIDS[0])
    grid[0] = 10
    expect(isValidSolution(grid)).toBe(false)
  })
})

describe("parsePuzzle", () => {
  it("treats '.' and '0' as empty", () => {
    const parsed = parsePuzzle(".".repeat(40) + "0".repeat(41))
    expect(parsed).toHaveLength(81)
    expect(parsed.every((b) => b === 0)).toBe(true)
  })

  it("maps '1'-'9' to their digit values", () => {
    const parsed = parsePuzzle("1".repeat(81))
    expect(parsed.every((b) => b === 1)).toBe(true)
  })

  it("throws on invalid length or chars", () => {
    expect(() => parsePuzzle("1".repeat(80))).toThrow()
    expect(() => parsePuzzle("a".repeat(81))).toThrow()
  })
})

describe("findConflicts", () => {
  it("returns empty set for an empty grid", () => {
    expect(findConflicts(new Uint8Array(81)).size).toBe(0)
  })

  it("returns empty set for a valid solution", () => {
    expect(findConflicts(asBytes(VALID_GRIDS[0])).size).toBe(0)
  })

  it("flags both cells of a row duplicate", () => {
    const grid = new Uint8Array(81)
    grid[0] = 5
    grid[3] = 5 // same row
    const c = findConflicts(grid)
    expect(c.has(0)).toBe(true)
    expect(c.has(3)).toBe(true)
    expect(c.size).toBe(2)
  })

  it("flags a column duplicate", () => {
    const grid = new Uint8Array(81)
    grid[0] = 5
    grid[27] = 5 // same column, different row and box
    const c = findConflicts(grid)
    expect(c.has(0)).toBe(true)
    expect(c.has(27)).toBe(true)
  })

  it("flags a 3x3 box duplicate", () => {
    const grid = new Uint8Array(81)
    grid[0] = 5
    grid[10] = 5 // same top-left box, different row and column
    const c = findConflicts(grid)
    expect(c.has(0)).toBe(true)
    expect(c.has(10)).toBe(true)
  })

  it("ignores empty cells", () => {
    const grid = new Uint8Array(81)
    grid[0] = 3
    expect(findConflicts(grid).size).toBe(0)
  })
})

describe("solve", () => {
  it("solves a real starter puzzle", () => {
    const givens = parsePuzzle("4...3.......6..8..........1....5..9..8....6...7.2........1.27..5.3....4.9........")
    const solved = solve(givens)
    expect(solved).not.toBeNull()
    expect(isValidSolution(solved!)).toBe(true)
    for (let i = 0; i < 81; i++) {
      if (givens[i] !== 0) expect(solved![i]).toBe(givens[i])
    }
  })

  it("returns null for givens that violate sudoku rules", () => {
    const givens = new Uint8Array(81)
    givens[0] = 5
    givens[1] = 5 // same row
    expect(solve(givens)).toBeNull()
  })

  it("solves the empty grid", () => {
    expect(solve(new Uint8Array(81))).not.toBeNull()
  })
})

describe("gridToUint8Array", () => {
  it("prefers givens over entries", () => {
    const givens = new Uint8Array(81)
    givens[0] = 7
    const entries = new Array<number | null>(81).fill(null)
    entries[0] = 3
    entries[1] = 4
    const out = gridToUint8Array(givens, entries)
    expect(out[0]).toBe(7)
    expect(out[1]).toBe(4)
  })

  it("fills unset cells with 0", () => {
    const givens = new Uint8Array(81)
    const entries = new Array<number | null>(81).fill(null)
    const out = gridToUint8Array(givens, entries)
    expect(out.every((b) => b === 0)).toBe(true)
  })
})

describe("givensToMask", () => {
  const popcount = (mask: Uint8Array): number => {
    let count = 0
    for (const byte of mask) {
      let b = byte
      while (b) {
        b &= b - 1
        count++
      }
    }
    return count
  }

  it("returns 11 bytes", () => {
    expect(givensToMask(new Uint8Array(81))).toHaveLength(11)
  })

  it("returns all zeros for an empty grid", () => {
    expect(givensToMask(new Uint8Array(81)).every((b) => b === 0)).toBe(true)
  })

  it("sets bit 0 as the MSB of byte 0 (big-endian)", () => {
    const givens = new Uint8Array(81)
    givens[0] = 5
    const mask = givensToMask(givens)
    expect(mask[0]).toBe(0x80)
    expect(mask.slice(1).every((b) => b === 0)).toBe(true)
  })

  it("sets bit 8 as the MSB of byte 1", () => {
    const givens = new Uint8Array(81)
    givens[8] = 3
    const mask = givensToMask(givens)
    expect(mask[0]).toBe(0)
    expect(mask[1]).toBe(0x80)
  })

  it("sets bit 80 as the MSB of byte 10", () => {
    const givens = new Uint8Array(81)
    givens[80] = 9
    const mask = givensToMask(givens)
    expect(mask[10]).toBe(0x80)
  })

  it("popcount matches number of non-zero givens", () => {
    const givens = parsePuzzle("4...3.......6..8..........1....5..9..8....6...7.2........1.27..5.3....4.9........")
    const expected = Array.from(givens).filter((v) => v !== 0).length
    expect(popcount(givensToMask(givens))).toBe(expected)
  })
})

describe("parseAssetUrl", () => {
  const VALID_SOLUTION = VALID_GRIDS[0]

  const buildUrl = (solution: Uint8Array, mask: Uint8Array): Uint8Array => {
    const url = new Uint8Array(92)
    url.set(solution, 0)
    url.set(mask, 81)
    return url
  }

  it("throws on wrong length", () => {
    expect(() => parseAssetUrl(new Uint8Array(91))).toThrow()
    expect(() => parseAssetUrl(new Uint8Array(93))).toThrow()
  })

  it("returns the full solution and an all-zero puzzle when mask is empty", () => {
    const solution = asBytes(VALID_SOLUTION)
    const { puzzle, solution: out } = parseAssetUrl(buildUrl(solution, new Uint8Array(11)))
    expect(out).toEqual(solution)
    expect(puzzle.every((v) => v === 0)).toBe(true)
  })

  it("returns puzzle = solution when every mask bit is set", () => {
    const solution = asBytes(VALID_SOLUTION)
    const mask = new Uint8Array(11).fill(0xff)
    mask[10] = 0x80
    const { puzzle, solution: out } = parseAssetUrl(buildUrl(solution, mask))
    expect(out).toEqual(solution)
    for (let i = 0; i < 81; i++) expect(puzzle[i]).toBe(solution[i])
  })

  it("respects big-endian bit order matching givensToMask", () => {
    const solution = asBytes(VALID_SOLUTION)
    const originalPuzzle = new Uint8Array(81)
    originalPuzzle[0] = solution[0]
    originalPuzzle[8] = solution[8]
    originalPuzzle[80] = solution[80]
    const mask = givensToMask(originalPuzzle)
    const { puzzle } = parseAssetUrl(buildUrl(solution, mask))
    expect(puzzle[0]).toBe(solution[0])
    expect(puzzle[8]).toBe(solution[8])
    expect(puzzle[80]).toBe(solution[80])
    expect(puzzle[1]).toBe(0)
    expect(puzzle[79]).toBe(0)
  })

  it("round-trips an arbitrary givens grid via givensToMask", () => {
    const givens = parsePuzzle("4...3.......6..8..........1....5..9..8....6...7.2........1.27..5.3....4.9........")
    const solution = solve(givens)!
    expect(solution).not.toBeNull()
    const mask = givensToMask(givens)
    const { puzzle, solution: out } = parseAssetUrl(buildUrl(solution, mask))
    expect(out).toEqual(solution)
    expect(puzzle).toEqual(givens)
  })

  describe.each(VALID_GRIDS)("round-trip for solution %#", (solutionStr) => {
    const solution = asBytes(solutionStr)

    const derivePuzzle = (keepIf: (i: number) => boolean): Uint8Array => {
      const out = new Uint8Array(81)
      for (let i = 0; i < 81; i++) if (keepIf(i)) out[i] = solution[i]
      return out
    }

    const cases: { name: string; puzzle: Uint8Array }[] = [
      { name: "no givens", puzzle: derivePuzzle(() => false) },
      { name: "all givens", puzzle: derivePuzzle(() => true) },
      { name: "alternating", puzzle: derivePuzzle((i) => i % 2 === 0) },
      { name: "first 30", puzzle: derivePuzzle((i) => i < 30) },
      { name: "last 30", puzzle: derivePuzzle((i) => i >= 51) },
    ]

    it.each(cases)("isomorphism holds for $name", ({ puzzle: original }) => {
      const url = buildUrl(solution, givensToMask(original))
      const { puzzle, solution: out } = parseAssetUrl(url)
      expect(out).toEqual(solution)
      expect(puzzle).toEqual(original)
    })
  })
})

const popcount = (arr: Uint8Array): number => arr.reduce((n, v) => n + (v !== 0 ? 1 : 0), 0)
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

describe.each<Difficulty>(["easy", "hard"])("generatePuzzle(%s)", (difficulty) => {
  it("returns an 81-byte puzzle and solution", () => {
    const { puzzle, solution } = generatePuzzle(difficulty)
    expect(puzzle).toHaveLength(81)
    expect(solution).toHaveLength(81)
  })

  it("solution is a valid sudoku", () => {
    const { solution } = generatePuzzle(difficulty)
    expect(isValidSolution(solution)).toBe(true)
  })

  it("puzzle cells are 0 (empty) or match solution", () => {
    const { puzzle, solution } = generatePuzzle(difficulty)
    for (let i = 0; i < 81; i++) {
      expect(puzzle[i] === 0 || puzzle[i] === solution[i]).toBe(true)
    }
  })

  it("clue count stays within [MIN_CLUES, MAX_CLUES] across many runs", () => {
    for (let i = 0; i < 50; i++) {
      const { puzzle } = generatePuzzle(difficulty)
      const clues = popcount(puzzle)
      expect(clues).toBeGreaterThanOrEqual(MIN_CLUES)
      expect(clues).toBeLessThanOrEqual(MAX_CLUES)
    }
  })

  it("produces varied clue counts across calls", () => {
    const counts = new Set<number>()
    for (let i = 0; i < 30; i++) counts.add(popcount(generatePuzzle(difficulty).puzzle))
    expect(counts.size).toBeGreaterThan(1)
  })

  it("produces distinct puzzles across calls", () => {
    const a = generatePuzzle(difficulty)
    const b = generatePuzzle(difficulty)
    expect(a.solution).not.toEqual(b.solution)
  })

  it("puzzle is solvable via solve() and matches the generator's solution", () => {
    const { puzzle, solution } = generatePuzzle(difficulty)
    const solved = solve(puzzle)
    expect(solved).not.toBeNull()
    expect(solved).toEqual(solution)
  })
})

describe("generatePuzzle difficulty ordering", () => {
  // Sample-based check that the `difficulty` arg actually affects output.
  // Bands are wide apart (easy ~35–40, hard ~23–27) so the mean gap is robust
  // well beyond per-call variance across 10 samples.
  it("easy puzzles have more clues than hard on average", () => {
    const SAMPLES = 10
    const easy = Array.from({ length: SAMPLES }, () => popcount(generatePuzzle("easy").puzzle))
    const hard = Array.from({ length: SAMPLES }, () => popcount(generatePuzzle("hard").puzzle))
    expect(mean(easy)).toBeGreaterThan(mean(hard) + 5)
    expect(Math.min(...easy)).toBeGreaterThan(Math.max(...hard))
  })
})
