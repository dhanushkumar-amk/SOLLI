import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipContext = React.createContext({
  open: false,
  setOpen: () => {},
})

function TooltipProvider({ children }) {
  return <>{children}</>
}

function Tooltip({ children, delayDuration = 300 }) {
  const [open, setOpen] = React.useState(false)
  const timeoutRef = React.useRef(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration)
  }

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current)
    setOpen(false)
  }

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <span ref={ref} className={cn("inline-flex", className)} {...props}>
      {children}
    </span>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef(
  ({ className, side = "top", children, ...props }, ref) => {
    const { open } = React.useContext(TooltipContext)
    if (!open) return null

    const positionClasses = {
      top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
      bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
      left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
      right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
    }[side] || "bottom-full left-1/2 -translate-x-1/2 mb-1.5"

    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          "absolute z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none whitespace-nowrap",
          positionClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

