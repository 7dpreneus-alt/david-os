import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PROJECT_HEALTH_META, type ProjectHealth } from '../types'

/**
 * Health chip with the explanation on hover — health must always be
 * explainable from underlying data (requirement 4).
 */
export function ProjectHealthBadge({
  health,
  reasons,
}: {
  health: ProjectHealth
  reasons: string[]
}) {
  const meta = PROJECT_HEALTH_META[health]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: `var(${meta.colorVar})` }}
          />
          {meta.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="list-none">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
