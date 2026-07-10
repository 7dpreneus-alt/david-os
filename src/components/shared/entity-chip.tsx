"use client"

import * as React from "react"

import { getEntityType } from "@/core/entities"
import { findEntity, type EntityOption } from "@/lib/entity-query"
import { Badge } from "@/components/ui/badge"

/**
 * Small registry-driven reference chip: resolves any entity id to its icon
 * and title. Used wherever one entity displays a link to another.
 */
export function EntityChip({ id }: { id: string }) {
  const [entity, setEntity] = React.useState<EntityOption>()

  React.useEffect(() => {
    let cancelled = false
    void findEntity(id).then((resolved) => {
      if (!cancelled) setEntity(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!entity) return null
  const Icon = getEntityType(entity.type)?.icon

  return (
    <Badge variant="secondary" className="gap-1 font-normal">
      {Icon && <Icon className="h-3 w-3" />}
      <span className="max-w-[140px] truncate">{entity.title}</span>
    </Badge>
  )
}
