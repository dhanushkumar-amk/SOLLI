import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const SheetContext = React.createContext({
  open: false,
  onOpenChange: () => {},
})

function Sheet({ open, onOpenChange, children }) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

function SheetTrigger({ className, children, ...props }) {
  const { onOpenChange } = React.useContext(SheetContext)
  return (
    <button
      type="button"
      className={cn("cursor-pointer", className)}
      onClick={() => onOpenChange?.(true)}
      {...props}
    >
      {children}
    </button>
  )
}

const SheetContent = React.forwardRef(
  ({ side = "bottom", className, children, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(SheetContext)
    if (!open) return null

    const sideClasses = {
      bottom: "inset-x-0 bottom-0 border-t rounded-t-2xl max-h-[85vh]",
      top: "inset-x-0 top-0 border-b rounded-b-2xl",
      right: "inset-y-0 right-0 h-full w-3/4 border-l max-w-sm",
      left: "inset-y-0 left-0 h-full w-3/4 border-r max-w-sm",
    }[side] || "inset-x-0 bottom-0 border-t rounded-t-2xl max-h-[85vh]"

    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          onClick={() => onOpenChange?.(false)}
        />
        <div
          ref={ref}
          role="dialog"
          className={cn(
            "fixed z-50 gap-4 bg-card p-6 shadow-2xl transition ease-in-out border-border overflow-y-auto",
            sideClasses,
            className
          )}
          {...props}
        >
          {children}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            onClick={() => onOpenChange?.(false)}
          >
            <X className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    )
  }
)
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-2 text-left", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

