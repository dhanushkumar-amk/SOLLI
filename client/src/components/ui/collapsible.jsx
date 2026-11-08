import * as React from "react"
import { cn } from "@/lib/utils"

const CollapsibleContext = React.createContext({
  open: false,
  onOpenChange: () => {},
})

const Collapsible = React.forwardRef(
  ({ open: controlledOpen, defaultOpen = false, onOpenChange, className, children, ...props }, ref) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : uncontrolledOpen

    const handleOpenChange = React.useCallback(
      (nextOpen) => {
        if (!isControlled) {
          setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
      },
      [isControlled, onOpenChange]
    )

    return (
      <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
        <div ref={ref} className={cn("w-full", className)} data-state={open ? "open" : "closed"} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef(({ className, children, asChild = false, onClick, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(CollapsibleContext)
  return (
    <button
      ref={ref}
      type="button"
      className={cn("cursor-pointer", className)}
      data-state={open ? "open" : "closed"}
      onClick={(e) => {
        onClick?.(e)
        onOpenChange(!open)
      }}
      {...props}
    >
      {children}
    </button>
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open } = React.useContext(CollapsibleContext)
  if (!open) return null
  return (
    <div
      ref={ref}
      className={cn("overflow-hidden transition-all", className)}
      data-state={open ? "open" : "closed"}
      {...props}
    >
      {children}
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

