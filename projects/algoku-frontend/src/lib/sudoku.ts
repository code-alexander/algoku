import { SudokuCreator } from "@algorithm.ts/sudoku"

// Client-side sudoku validator.
//
// Mirrors the AVM contract at
// projects/algoku-contracts/smart_contracts/algoku/contract.py — 9-bit bitmasks
// per row / column / box, each bit representing a still-missing digit. A group
// is satisfied when its mask is all-zero; the whole grid is valid when every
// group's mask clears.
//
// Unlike XOR-toggling, the contract uses setbit_bytes(_, _, False) which
// force-clears. We match that: duplicates collapse to one clear (no accidental
// re-set), so a missing digit elsewhere still leaves its bit set → rejection.

const creator = new SudokuCreator({ childMatrixWidth: 3 })

export function generatePuzzle(difficulty = 0.5): { puzzle: Uint8Array; solution: Uint8Array } {
  const { puzzle, solution } = creator.createSudoku(difficulty)
  return {
    puzzle: Uint8Array.from(puzzle, (v) => (v === -1 ? 0 : v + 1)),
    solution: Uint8Array.from(solution, (v) => v + 1),
  }
}

export function isValidSolution(grid: Uint8Array): boolean {
  if (grid.length !== 81) return false

  const rows = new Uint16Array(9).fill(0x1ff)
  const cols = new Uint16Array(9).fill(0x1ff)
  const boxes = new Uint16Array(9).fill(0x1ff)

  for (let i = 0; i < 81; i++) {
    const cell = grid[i]
    if (cell < 1 || cell > 9) return false
    const r = (i / 9) | 0
    const c = i % 9
    const b = ((r / 3) | 0) * 3 + ((c / 3) | 0)
    const mask = 1 << (cell - 1)
    rows[r] &= ~mask
    cols[c] &= ~mask
    boxes[b] &= ~mask
  }

  for (let g = 0; g < 9; g++) {
    if (rows[g] !== 0 || cols[g] !== 0 || boxes[g] !== 0) return false
  }
  return true
}

// Rule-violation check used by the "check" button: returns the set of cell
// indices that duplicate another filled cell in their row, column, or box.
// Empty cells (0) are never flagged.
export function findConflicts(grid: Uint8Array): Set<number> {
  const conflicts = new Set<number>()
  const rows: number[][][] = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
  const cols: number[][][] = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
  const boxes: number[][][] = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))

  for (let i = 0; i < 81; i++) {
    const v = grid[i]
    if (v < 1 || v > 9) continue
    const r = (i / 9) | 0
    const c = i % 9
    const b = ((r / 3) | 0) * 3 + ((c / 3) | 0)
    rows[r][v - 1].push(i)
    cols[c][v - 1].push(i)
    boxes[b][v - 1].push(i)
  }

  for (const groups of [rows, cols, boxes]) {
    for (const group of groups) {
      for (const positions of group) {
        if (positions.length > 1) for (const p of positions) conflicts.add(p)
      }
    }
  }
  return conflicts
}

// Backtracking solver used by the dev auto-solve shortcut. Returns a filled
// 81-byte grid, or null if the givens are inconsistent or unsolvable.
export function solve(givens: Uint8Array): Uint8Array | null {
  if (givens.length !== 81) return null
  const grid = new Uint8Array(givens)
  const rows = new Uint16Array(9)
  const cols = new Uint16Array(9)
  const boxes = new Uint16Array(9)

  for (let i = 0; i < 81; i++) {
    const v = grid[i]
    if (v === 0) continue
    if (v < 1 || v > 9) return null
    const r = (i / 9) | 0
    const c = i % 9
    const b = ((r / 3) | 0) * 3 + ((c / 3) | 0)
    const bit = 1 << (v - 1)
    if ((rows[r] | cols[c] | boxes[b]) & bit) return null
    rows[r] |= bit
    cols[c] |= bit
    boxes[b] |= bit
  }

  const bt = (start: number): boolean => {
    let i = start
    while (i < 81 && grid[i] !== 0) i++
    if (i === 81) return true
    const r = (i / 9) | 0
    const c = i % 9
    const b = ((r / 3) | 0) * 3 + ((c / 3) | 0)
    const used = rows[r] | cols[c] | boxes[b]
    for (let v = 1; v <= 9; v++) {
      const bit = 1 << (v - 1)
      if (used & bit) continue
      grid[i] = v
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      if (bt(i + 1)) return true
      grid[i] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
    }
    return false
  }

  return bt(0) ? grid : null
}

export function parsePuzzle(s: string): Uint8Array {
  if (s.length !== 81) throw new Error(`Puzzle must be 81 chars, got ${s.length}`)
  const out = new Uint8Array(81)
  for (let i = 0; i < 81; i++) {
    const c = s.charCodeAt(i)
    if (c === 46 || c === 48) out[i] = 0
    else if (c >= 49 && c <= 57) out[i] = c - 48
    else throw new Error(`Invalid puzzle char '${s[i]}' at index ${i}`)
  }
  return out
}

export function gridToUint8Array(givens: Uint8Array, entries: readonly (number | null)[]): Uint8Array {
  const out = new Uint8Array(81)
  for (let i = 0; i < 81; i++) {
    out[i] = givens[i] !== 0 ? givens[i] : (entries[i] ?? 0)
  }
  return out
}

export function givensToMask(givens: Uint8Array): Uint8Array {
  const mask = new Uint8Array(11)
  for (let i = 0; i < 81; i++) {
    if (givens[i] !== 0) mask[i >> 3] |= 0x80 >> (i & 7)
  }
  return mask
}

export function parseAssetUrl(url: Uint8Array): { puzzle: Uint8Array; solution: Uint8Array } {
  if (url.length !== 92) throw new Error(`Asset URL must be 92 bytes, got ${url.length}`)
  const solution = url.slice(0, 81)
  const mask = url.slice(81, 92)
  const puzzle = new Uint8Array(81)
  for (let i = 0; i < 81; i++) {
    const given = (mask[i >> 3] & (0x80 >> (i & 7))) !== 0
    puzzle[i] = given ? solution[i] : 0
  }
  return { puzzle, solution }
}
