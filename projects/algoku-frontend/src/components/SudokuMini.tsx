import { cn } from "@/lib/utils"

interface SudokuMiniProps {
  puzzle: Uint8Array
  solution: Uint8Array
  className?: string
}

// Pure presentational mini-grid: givens (from puzzle, non-zero) render bold;
// filled-in solution cells render muted. Function of props, nothing else.
const SudokuMini = ({ puzzle, solution, className }: SudokuMiniProps) => {
  return (
    <div
      className={cn("grid aspect-square w-full grid-cols-9 border border-foreground/40 bg-background", className)}
      role="img"
      aria-label="sudoku solution preview"
    >
      {Array.from({ length: 81 }, (_, i) => {
        const isGiven = puzzle[i] !== 0
        const value = isGiven ? puzzle[i] : solution[i]
        const r = (i / 9) | 0
        const c = i % 9
        return (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center text-[0.6rem] leading-none",
              "border-foreground/20",
              c % 3 === 0 && c !== 0 ? "border-l border-l-foreground/60" : "border-l",
              r % 3 === 0 && r !== 0 ? "border-t border-t-foreground/60" : "border-t",
              isGiven ? "font-bold text-foreground" : "text-muted-foreground",
            )}
          >
            {value > 0 ? value : ""}
          </div>
        )
      })}
    </div>
  )
}

export default SudokuMini
