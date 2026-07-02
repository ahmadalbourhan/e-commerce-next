"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "./app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react"

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
      <AppSidebar onSignOut={handleLogout} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-end">
            <Badge variant="secondary" className="max-w-[180px] truncate">
              {user.fullName || user.email || "User"}
            </Badge>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
