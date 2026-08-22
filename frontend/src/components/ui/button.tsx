import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500 text-black font-semibold hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)]",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.35)]",
        outline:
          "border border-white/10 bg-black/20 hover:bg-white/5 hover:border-cyan-500/50 text-gray-200",
        secondary:
          "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/50",
        ghost:
          "hover:bg-white/5 text-gray-300 hover:text-white",
        link:
          "text-cyan-400 underline-offset-4 hover:underline",
        cyber:
          "bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold hover:opacity-90 shadow-[0_0_20px_rgba(6,182,212,0.4)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
