"use client"

import * as React from "react"
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Settings,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Logo } from "@/components/logo"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "David",
    email: "david@davidos.app",
    avatar: "",
  },
  navGroups: [
    {
      label: "Overview",
      items: [
        {
          title: "Mission Control",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Work",
      items: [
        {
          title: "Tasks",
          url: "/tasks",
          icon: CheckSquare,
        },
        {
          title: "Calendar",
          url: "/calendar",
          icon: Calendar,
        },
      ],
    },
    {
      label: "System",
      items: [
        {
          title: "Settings",
          url: "#",
          icon: Settings,
          items: [
            {
              title: "Profile",
              url: "/settings/user",
            },
            {
              title: "Account",
              url: "/settings/account",
            },
            {
              title: "Appearance",
              url: "/settings/appearance",
            },
            {
              title: "Notifications",
              url: "/settings/notifications",
            },
          ],
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">DavidOS</span>
                  <span className="truncate text-xs">Personal AI OS</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
