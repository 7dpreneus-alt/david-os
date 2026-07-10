"use client"

import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

const sizes = { sm: 20, md: 32, lg: 44 }

/** Branded route-transition state: the DavidOS mark, pulsing quietly. */
export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] items-center justify-center",
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <Logo
        size={sizes[size]}
        className="animate-pulse text-muted-foreground motion-reduce:animate-none"
      />
    </div>
  )
}
