import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(
  ({ className, min = 0, max = 100, step = 1, value = [0], onValueChange, disabled = false, ...props }, ref) => {
    const val = Array.isArray(value) ? value[0] : value
    const percentage = ((val - min) / (max - min)) * 100

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          disabled={disabled}
          onChange={(e) => onValueChange?.([Number(e.target.value)])}
          className="w-full accent-primary bg-secondary h-2 rounded-lg cursor-pointer"
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }

