import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/30 bg-destructive/20 text-white shadow",
        outline: "border-border text-foreground",
        success:
          "border-[#FF6D29]/40 bg-[#FF6D29]/15 text-[#FF6D29]",
        warning:
          "border-amber-500/40 bg-amber-500/15 text-amber-300",
        brand:
          "border-[#FF6D29]/50 bg-[#FF6D29]/20 text-[#FF6D29]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
