"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FolderTree,
  Users,
  Shield,
  ShieldCheck,
  LogOut,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Orders", href: "/dashboard/orders", icon: ClipboardList },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", href: "/products", icon: Package },
      { title: "Categories", href: "/categories", icon: FolderTree },
    ],
  },
  {
    label: "Access control",
    items: [
      { title: "Users", href: "/users", icon: Users },
      { title: "Roles", href: "/roles", icon: Shield },
    ],
  },
]

export function AppSidebar({ onSignOut }: { onSignOut: () => void }) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4.5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Ecommerce</span>
            <span className="text-xs text-muted-foreground">Admin Console</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} tooltip="Sign out">
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
