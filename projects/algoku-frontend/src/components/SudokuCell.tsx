import { cn } from "@/lib/utils"

interface SudokuCellProps {
  index: number
  value: number
  isGiven: boolean
  isSelected: boolean
  hasConflict: boolean
  onSelect: () => void
}

const SudokuCell = ({ index, value, isGiven, isSelected, hasConflict, onSelect }: SudokuCellProps) => {
  const row = Math.floor(index / 9)
  const col = index % 9

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex aspect-square items-center justify-center text-xl font-semibold transition-colors focus:outline-hidden",
        "hover:bg-accent/60",
        row > 0 && (row === 3 || row === 6 ? "border-t-2 border-t-border" : "border-t border-t-border"),
        col > 0 && (col === 3 || col === 6 ? "border-l-2 border-l-border" : "border-l border-l-border"),
        isSelected && !hasConflict && "bg-primary/15 ring-2 ring-primary ring-inset",
        isSelected && hasConflict && "ring-2 ring-destructive ring-inset",
        isGiven ? "text-foreground" : "text-primary",
        hasConflict && "bg-destructive/20 text-destructive hover:bg-destructive/25",
      )}
      aria-label={`cell row ${row + 1} column ${col + 1}${value ? `, value ${value}` : ", empty"}`}
    >
      {value || ""}
    </button>
  )
}

export default SudokuCell
