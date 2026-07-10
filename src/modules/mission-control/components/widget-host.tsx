"use client"

import * as React from "react"

import type { WidgetDef } from "@/core/widgets"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface WidgetErrorBoundaryProps {
  title: string
  children: React.ReactNode
}

class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[mission-control] widget "${this.props.title}" crashed`, error)
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="text-sm text-muted-foreground">
          This widget hit an error. The rest of Mission Control is unaffected.
        </p>
      )
    }
    return this.props.children
  }
}

/**
 * v0 widget host: renders one registered widget definition inside a card.
 * A crashing widget is isolated. Phase 3 adds workspace-owned instances
 * (position, pin, hide, config) on top of this exact surface.
 */
export function WidgetHost({ def }: { def: WidgetDef }) {
  const Component = def.component
  if (!Component) return null

  return (
    <Card className={cn(def.defaultSize?.w === 2 && "md:col-span-2")}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        {def.icon && <def.icon className="h-4 w-4 text-muted-foreground" />}
        <CardTitle className="text-sm font-medium">{def.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <WidgetErrorBoundary title={def.title}>
          <Component />
        </WidgetErrorBoundary>
      </CardContent>
    </Card>
  )
}
