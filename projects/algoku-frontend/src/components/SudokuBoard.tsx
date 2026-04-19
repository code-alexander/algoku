import { memo, useEffect, useRef } from "react"

import SudokuCell from "@/components/SudokuCell"

interface SudokuBoardProps {
  givens: Uint8Array
  entries: (number | null)[]
  selectedIndex: number | null
  conflicts: ReadonlySet<number>
  onSelect: (index: number) => void
  onMove: (dx: number, dy: number) => void
  onSetCell: (index: number, value: number | null) => void
}

const SudokuBoard = ({ givens, entries, selectedIndex, conflicts, onSelect, onMove, onSetCell }: SudokuBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    boardRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      onMove(-1, 0)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      onMove(1, 0)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      onMove(0, -1)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      onMove(0, 1)
    } else if (/^[1-9]$/.test(e.key) && selectedIndex !== null) {
      e.preventDefault()
      onSetCell(selectedIndex, Number(e.key))
    } else if ((e.key === "Backspace" || e.key === "Delete" || e.key === "0") && selectedIndex !== null) {
      e.preventDefault()
      onSetCell(selectedIndex, null)
    }
  }

  return (
    <div
      ref={boardRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="grid aspect-square w-full max-w-md grid-cols-9 overflow-hidden rounded-md border bg-background shadow-xs outline-hidden lg:max-w-lg xl:max-w-xl"
      role="grid"
      aria-label="sudoku board"
    >
      {Array.from({ length: 81 }, (_, i) => {
        const given = givens[i]
        const value = given !== 0 ? given : (entries[i] ?? 0)
        return (
          <SudokuCell
            key={i}
            index={i}
            value={value}
            isGiven={given !== 0}
            isSelected={selectedIndex === i}
            hasConflict={conflicts.has(i)}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}

export default memo(SudokuBoard)
