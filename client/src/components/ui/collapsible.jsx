import * as React from "react"
import { cn } from "@/lib/utils"

const CollapsibleContext = React.createContext({
  open: false,
  onOpenChange: () => {},
})

const Collapsible = React.forwardRef(
  ({ open, defaultOpen = false, onOpenChange, className, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)
    const controlled = open !== undefined
    const currentOpen = controlled ? open : isOpen

    const handleToggle = React.useCallback(() => {
      const next = !currentOpen
      if (!controlled) setIsOpen(next)
      onOpenChange?.(next)
    }, [controlled, currentOpen, onOpenChange])

    return (
      <CollapsibleContext.Provider value={{ open: currentOpen, onOpenChange: handleToggle }}>
        <div ref={ref} className={cn("w-full", className)} data-state={currentOpen ? "open" : "closed"} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef(({ className, children, onClick, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(CollapsibleContext)
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      data-state={open ? "open" : "closed"}
      className={cn("flex items-center cursor-pointer", className)}
      onClick={(e) => {
        onClick?.(e)
        onOpenChange()
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
      data-state={open ? "open" : "closed"}
      className={cn("overflow-hidden transition-all", className)}
      {...props}
    >
      {children}
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
