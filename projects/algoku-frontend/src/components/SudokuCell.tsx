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
        "flex aspect-square items-center justify-center border border-border text-xl font-semibold transition-colors focus:outline-hidden",
        "hover:bg-accent/60",
        isSelected && !hasConflict && "bg-primary/15 ring-2 ring-primary ring-inset",
        isSelected && hasConflict && "ring-2 ring-destructive ring-inset",
        isGiven ? "text-foreground" : "text-primary",
        hasConflict && "bg-destructive/20 text-destructive hover:bg-destructive/25",
        (col + 1) % 3 === 0 && col !== 8 && "border-r-2 border-r-foreground/70",
        (row + 1) % 3 === 0 && row !== 8 && "border-b-2 border-b-foreground/70",
      )}
      aria-label={`cell row ${row + 1} column ${col + 1}${value ? `, value ${value}` : ", empty"}`}
    >
      {value || ""}
    </button>
  )
}

export default SudokuCell
