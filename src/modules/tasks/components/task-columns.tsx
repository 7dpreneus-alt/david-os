"use client"

import type { ColumnDef, Table } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/shared/data-table/data-table-column-header"
import { cn } from "@/lib/utils"
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskStatus } from "../types"

export interface TasksTableMeta {
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onSetStatus: (task: Task, status: TaskStatus) => void
}

function meta(table: Table<Task>): TasksTableMeta {
  return table.options.meta as TasksTableMeta
}

export const taskColumns: ColumnDef<Task>[] = [
  {
    id: "done",
    header: "",
    cell: ({ row, table }) => (
      <Checkbox
        aria-label={row.original.status === "done" ? "Reopen task" : "Complete task"}
        checked={row.original.status === "done"}
        onCheckedChange={(checked) =>
          meta(table).onSetStatus(row.original, checked ? "done" : "todo")
        }
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Task" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "max-w-[380px] truncate font-medium",
            row.original.status === "done" && "text-muted-foreground line-through"
          )}
        >
          {row.original.title}
        </span>
        {row.original.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = TASK_STATUSES.find((s) => s.value === row.original.status)
      if (!status) return null
      return (
        <div className="flex items-center gap-2">
          <status.icon className="h-4 w-4 text-muted-foreground" />
          <span>{status.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
    cell: ({ row }) => {
      const priority = TASK_PRIORITIES.find((p) => p.value === row.original.priority)
      if (!priority) return null
      return (
        <div className="flex items-center gap-2">
          <priority.icon className="h-4 w-4 text-muted-foreground" />
          <span>{priority.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
    cell: ({ row }) => {
      const due = row.original.dueDate
      if (!due) return <span className="text-muted-foreground">—</span>
      const overdue =
        row.original.status !== "done" && due < new Date().toISOString().slice(0, 10)
      return <span className={cn(overdue && "text-destructive")}>{due}</span>
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const task = row.original
      const done = task.status === "done"
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            >
              <MoreHorizontal />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={() => meta(table).onEdit(task)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => meta(table).onSetStatus(task, done ? "todo" : "done")}
            >
              {done ? "Reopen" : "Complete"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => meta(table).onDelete(task)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
