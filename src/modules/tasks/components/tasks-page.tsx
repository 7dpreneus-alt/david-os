"use client"

import * as React from "react"
import { useSearchParams } from "react-router-dom"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { CheckSquare, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTableFacetedFilter } from "@/components/shared/data-table/data-table-faceted-filter"
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination"
import { DataTableViewOptions } from "@/components/shared/data-table/data-table-view-options"
import { useTasksStore } from "../store"
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskStatus } from "../types"
import { taskColumns, type TasksTableMeta } from "./task-columns"
import { TaskFormDialog } from "./task-form-dialog"

export default function TasksPage() {
  const { tasks, hydrated, hydrate, setStatus, remove } = useTasksStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<Task | undefined>()

  React.useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Palette deep links: /tasks?new=1 opens create, /tasks?task=<id> opens edit.
  React.useEffect(() => {
    if (searchParams.get("new")) {
      setEditingTask(undefined)
      setDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  React.useEffect(() => {
    const taskId = searchParams.get("task")
    if (taskId && hydrated) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setEditingTask(task)
        setDialogOpen(true)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, hydrated, tasks])

  const meta: TasksTableMeta = React.useMemo(
    () => ({
      onEdit: (task) => {
        setEditingTask(task)
        setDialogOpen(true)
      },
      onDelete: (task) => {
        void remove(task.id).then(() => toast(`Deleted "${task.title}"`))
      },
      onSetStatus: (task: Task, status: TaskStatus) => {
        void setStatus(task.id, status)
      },
    }),
    [remove, setStatus]
  )

  const table = useReactTable({
    data: tasks,
    columns: taskColumns,
    state: { sorting, columnFilters, columnVisibility },
    meta,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const isFiltered = table.getState().columnFilters.length > 0
  const showEmptyState = hydrated && tasks.length === 0

  return (
    <BaseLayout title="Tasks" description="Everything you've committed to getting done.">
      <div className="px-4 lg:px-6">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
            <CheckSquare className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No tasks yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first task — or press ⌘K and type "new task".
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingTask(undefined)
                setDialogOpen(true)
              }}
            >
              <Plus /> New task
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Filter tasks…"
                value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("title")?.setFilterValue(event.target.value)
                }
                className="h-8 w-[200px] lg:w-[280px]"
              />
              <DataTableFacetedFilter
                column={table.getColumn("status")}
                title="Status"
                options={TASK_STATUSES}
              />
              <DataTableFacetedFilter
                column={table.getColumn("priority")}
                title="Priority"
                options={TASK_PRIORITIES}
              />
              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.resetColumnFilters()}
                >
                  Reset <X />
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <DataTableViewOptions table={table} />
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTask(undefined)
                    setDialogOpen(true)
                  }}
                >
                  <Plus /> New task
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={taskColumns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No tasks match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination table={table} />
          </div>
        )}
      </div>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingTask(undefined)
        }}
        task={editingTask}
      />
    </BaseLayout>
  )
}
