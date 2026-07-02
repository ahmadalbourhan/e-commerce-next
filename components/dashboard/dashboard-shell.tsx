"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, LogOut, Loader2, ShieldAlert } from "lucide-react"

function initials(name?: string, email?: string) {
  const base = name?.trim() || email || "?"
  const parts = base.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "")
}

function isAdminRole(role?: string | null) {
  return role === "Admin" || role === "SuperAdmin"
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdminRole(user.role)) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle>You are not admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This dashboard is only available for Admin and SuperAdmin accounts.
            </p>
            <Button onClick={() => router.replace("/")} className="w-full">
              <ArrowLeft className="size-4" />
              Back to store
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  async function handleLogout() {
    await logout()
    router.replace("/login")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-end gap-3">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {user.role || "Member"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {initials(user.fullName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">
                    {user.fullName || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm">{user.fullName || "Admin"}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
