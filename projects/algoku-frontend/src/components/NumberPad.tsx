import { Eraser } from "lucide-react"

import { Button } from "@/components/ui/button"

interface NumberPadProps {
  onPress: (value: number | null) => void
  disabled: boolean
}

const NumberPad = ({ onPress, disabled }: NumberPadProps) => {
  return (
    <div className="grid w-full max-w-md grid-cols-10 gap-1">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
        <Button
          key={n}
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => onPress(n)}
          className="aspect-square h-auto w-full text-lg font-semibold"
        >
          {n}
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => onPress(null)}
        className="aspect-square h-auto w-full"
        aria-label="clear cell"
      >
        <Eraser className="h-5 w-5" />
      </Button>
    </div>
  )
}

export default NumberPad
