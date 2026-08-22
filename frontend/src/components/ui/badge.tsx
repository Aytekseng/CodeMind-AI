import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
        secondary:
          "border-transparent bg-zinc-800 text-zinc-300 border border-zinc-700",
        destructive:
          "border-transparent bg-rose-500/10 text-rose-400 border border-rose-500/30",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
        warning:
          "border-transparent bg-amber-500/10 text-amber-400 border border-amber-500/30",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
