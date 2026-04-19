import { useCallback, useMemo, useReducer } from "react"

import { gridToUint8Array } from "@/lib/sudoku"

export interface SudokuState {
  givens: Uint8Array
  entries: (number | null)[]
  selectedIndex: number | null
}

type Action =
  | { type: "load"; givens: Uint8Array }
  | { type: "select"; index: number | null }
  | { type: "move"; dx: number; dy: number }
  | { type: "setCell"; index: number; value: number | null }
  | { type: "clearEntries" }
  | { type: "fillEntries"; grid: Uint8Array }

function emptyEntries(): (number | null)[] {
  return new Array<number | null>(81).fill(null)
}

function initialState(givens: Uint8Array): SudokuState {
  return {
    givens,
    entries: emptyEntries(),
    selectedIndex: null,
  }
}

function reducer(state: SudokuState, action: Action): SudokuState {
  switch (action.type) {
    case "load":
      return initialState(action.givens)

    case "select":
      return { ...state, selectedIndex: action.index }

    case "move": {
      const current = state.selectedIndex ?? 0
      const row = Math.floor(current / 9)
      const col = current % 9
      const nr = (row + action.dy + 9) % 9
      const nc = (col + action.dx + 9) % 9
      return { ...state, selectedIndex: nr * 9 + nc }
    }

    case "setCell": {
      if (state.givens[action.index] !== 0) return state
      if (action.value !== null && (action.value < 1 || action.value > 9)) return state
      const entries = state.entries.slice()
      entries[action.index] = action.value
      return { ...state, entries }
    }

    case "clearEntries":
      return { ...state, entries: emptyEntries() }

    case "fillEntries": {
      const entries = state.entries.slice()
      for (let i = 0; i < 81; i++) {
        if (state.givens[i] === 0) {
          const v = action.grid[i]
          entries[i] = v >= 1 && v <= 9 ? v : null
        }
      }
      return { ...state, entries }
    }
  }
}

export function useSudokuState(initialGivens: Uint8Array) {
  const [state, dispatch] = useReducer(reducer, initialGivens, initialState)

  const loadPuzzle = useCallback((givens: Uint8Array) => dispatch({ type: "load", givens }), [])
  const setSelected = useCallback((index: number | null) => dispatch({ type: "select", index }), [])
  const moveSelection = useCallback((dx: number, dy: number) => dispatch({ type: "move", dx, dy }), [])
  const setCell = useCallback((index: number, value: number | null) => dispatch({ type: "setCell", index, value }), [])
  const clearEntries = useCallback(() => dispatch({ type: "clearEntries" }), [])
  const fillEntries = useCallback((grid: Uint8Array) => dispatch({ type: "fillEntries", grid }), [])

  const isFull = useMemo(() => {
    for (let i = 0; i < 81; i++) {
      if (state.givens[i] === 0 && state.entries[i] == null) return false
    }
    return true
  }, [state.givens, state.entries])

  const toSolution = useCallback(() => gridToUint8Array(state.givens, state.entries), [state.givens, state.entries])

  return {
    givens: state.givens,
    entries: state.entries,
    selectedIndex: state.selectedIndex,
    isFull,
    loadPuzzle,
    setSelected,
    moveSelection,
    setCell,
    clearEntries,
    fillEntries,
    toSolution,
  }
}
