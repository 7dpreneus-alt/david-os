import * as React from "react"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

/**
 * DavidOS mark: a "D" with an orbiting node — the OS and its workforce.
 * Draws in currentColor so it adapts to any surface.
 */
export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M10 7v18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M10 7h5.5a9 9 0 0 1 0 18H10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="26.5" cy="8" r="2.5" fill="currentColor" />
    </svg>
  )
}
