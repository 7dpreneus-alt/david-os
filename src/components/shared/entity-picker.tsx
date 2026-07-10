"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { getEntityType } from "@/core/entities"
import { listEntities, findEntity, type EntityOption } from "@/lib/entity-query"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface EntityPickerProps {
  /** Entity types to offer, e.g. ["project"]. Omit for every registered type. */
  types?: string[]
  value?: string
  onChange: (id: string | undefined) => void
  placeholder?: string
  /** Ids to hide (e.g. the entity being edited, to prevent self-links). */
  excludeIds?: string[]
  disabled?: boolean
  className?: string
}

/**
 * Registry-driven entity picker — the platform component for linking any
 * entity to any other. Types, icons, and labels come from the entity
 * registry, so future modules (Goals, Notes, Documents, Fitness, CRM…)
 * are pickable the moment they register, with no changes here.
 */
export function EntityPicker({
  types,
  value,
  onChange,
  placeholder = "Link an item…",
  excludeIds,
  disabled,
  className,
}: EntityPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<EntityOption[]>([])
  const [selected, setSelected] = React.useState<EntityOption>()

  // Refresh the option list each time the picker opens.
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    void listEntities(types).then((entities) => {
      if (!cancelled) setOptions(entities)
    })
    return () => {
      cancelled = true
    }
  }, [open, types])

  // Resolve the current value to a display title.
  React.useEffect(() => {
    if (!value) {
      setSelected(undefined)
      return
    }
    let cancelled = false
    void findEntity(value, types).then((entity) => {
      if (!cancelled) setSelected(entity)
    })
    return () => {
      cancelled = true
    }
  }, [value, types])

  const excluded = React.useMemo(() => new Set(excludeIds ?? []), [excludeIds])
  const grouped = React.useMemo(() => {
    const groups = new Map<string, EntityOption[]>()
    for (const option of options) {
      if (excluded.has(option.id)) continue
      const label = getEntityType(option.type)?.labels.plural ?? option.type
      const list = groups.get(label) ?? []
      list.push(option)
      groups.set(label, list)
    }
    return [...groups.entries()]
  }, [options, excluded])

  const SelectedIcon = selected ? getEntityType(selected.type)?.icon : undefined

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex min-w-0 items-center gap-2">
              {SelectedIcon && (
                <SelectedIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className={cn("truncate", !selected && "text-muted-foreground")}>
                {selected ? selected.title : placeholder}
              </span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>Nothing to link yet.</CommandEmpty>
              {grouped.map(([label, items]) => (
                <CommandGroup key={label} heading={label}>
                  {items.map((option) => {
                    const Icon = getEntityType(option.type)?.icon
                    return (
                      <CommandItem
                        key={option.id}
                        value={`${option.title} ${option.id}`}
                        onSelect={() => {
                          onChange(option.id === value ? undefined : option.id)
                          setOpen(false)
                        }}
                      >
                        {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                        <span className="truncate">{option.title}</span>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            option.id === value ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Clear link"
          onClick={() => onChange(undefined)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
