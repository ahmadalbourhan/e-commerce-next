"use client"

import { useState } from "react"
import useSWR from "swr"
import { api } from "@/lib/api"
import type { User } from "@/lib/types"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Plus, Minus, KeyRound, Loader2 } from "lucide-react"

export function UserPermissionsSheet({
  user,
  open,
  onOpenChange,
}: {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const assignedKey = user ? `/api/Permissions/users/${user.id}` : null
  const unassignedKey = user ? `/api/Permissions/users/${user.id}/unassigned` : null

  const assigned = useSWR<string[]>(open ? assignedKey : null, (p: string) => api.get<string[]>(p))
  const unassigned = useSWR<string[]>(open ? unassignedKey : null, (p: string) => api.get<string[]>(p))
  const [pending, setPending] = useState<string | null>(null)

  async function assign(slug: string) {
    if (!user) return
    setPending(slug)
    try {
      await api.post(`/api/Permissions/users/${user.id}/assign`, { permissionSlug: slug })
      toast.success(`Granted ${slug}`)
      assigned.mutate()
      unassigned.mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to grant permission")
    } finally {
      setPending(null)
    }
  }

  async function revoke(slug: string) {
    if (!user) return
    setPending(slug)
    try {
      await api.post(`/api/Permissions/users/${user.id}/revoke`, { permissionSlug: slug })
      toast.success(`Revoked ${slug}`)
      assigned.mutate()
      unassigned.mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke permission")
    } finally {
      setPending(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Permissions
          </SheetTitle>
          <SheetDescription>
            Grant or revoke permissions for {user?.fullName || user?.email}.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-6 px-4 pb-6">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Assigned</h3>
              {assigned.isLoading ? (
                <PermissionSkeletons />
              ) : assigned.data && assigned.data.length > 0 ? (
                assigned.data.map((slug) => (
                  <PermissionRow
                    key={slug}
                    slug={slug}
                    busy={pending === slug}
                    action="revoke"
                    onClick={() => revoke(slug)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No permissions assigned.</p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Available</h3>
              {unassigned.isLoading ? (
                <PermissionSkeletons />
              ) : unassigned.data && unassigned.data.length > 0 ? (
                unassigned.data.map((slug) => (
                  <PermissionRow
                    key={slug}
                    slug={slug}
                    busy={pending === slug}
                    action="assign"
                    onClick={() => assign(slug)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">All permissions assigned.</p>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function PermissionRow({
  slug,
  busy,
  action,
  onClick,
}: {
  slug: string
  busy: boolean
  action: "assign" | "revoke"
  onClick: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <Badge variant="secondary" className="font-mono text-xs font-normal">
        {slug}
      </Badge>
      <Button
        size="icon"
        variant={action === "revoke" ? "ghost" : "outline"}
        className="size-7 shrink-0"
        onClick={onClick}
        disabled={busy}
        aria-label={action === "revoke" ? `Revoke ${slug}` : `Grant ${slug}`}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : action === "revoke" ? (
          <Minus className="size-3.5 text-destructive" />
        ) : (
          <Plus className="size-3.5" />
        )}
      </Button>
    </div>
  )
}

function PermissionSkeletons() {
  return (
    <>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </>
  )
}
