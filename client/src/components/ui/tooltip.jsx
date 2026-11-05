import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }) => <>{children}</>

const Tooltip = ({ children }) => {
  return <div className="relative group inline-block">{children}</div>
}

const TooltipTrigger = React.forwardRef(({ asChild, className, children, ...props }, ref) => {
  return (
    <span ref={ref} className={cn("inline-flex", className)} {...props}>
      {children}
    </span>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef(({ className, side = "top", children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="tooltip"
      className={cn(
        "absolute z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity",
        side === "top" && "bottom-full mb-1 left-1/2 -translate-x-1/2",
        side === "bottom" && "top-full mt-1 left-1/2 -translate-x-1/2",
        side === "left" && "right-full mr-1 top-1/2 -translate-y-1/2",
        side === "right" && "left-full ml-1 top-1/2 -translate-y-1/2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
