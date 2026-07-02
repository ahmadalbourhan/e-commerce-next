"use client"

import { useState } from "react"
import useSWR from "swr"
import { api } from "@/lib/api"
import type { Role, Permission } from "@/lib/types"
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
import { Plus, Shield, Loader2 } from "lucide-react"

export function RolePermissionsSheet({
  role,
  open,
  onOpenChange,
}: {
  role: Role | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const perms = useSWR<Permission[]>(open ? "/api/Permissions" : null, (p: string) =>
    api.get<Permission[]>(p),
  )
  const [pending, setPending] = useState<number | null>(null)

  async function attach(permissionId: number, label: string) {
    if (!role) return
    setPending(permissionId)
    try {
      await api.post(`/api/Roles/${role.id}/permissions`, { permissionId })
      toast.success(`Added ${label} to ${role.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add permission")
    } finally {
      setPending(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            Role permissions
          </SheetTitle>
          <SheetDescription>Attach permissions to the {role?.name} role.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 px-4 pb-6">
            {perms.isLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : perms.data && perms.data.length > 0 ? (
              perms.data.map((p) => {
                const label = p.slug || p.name
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Badge variant="secondary" className="font-mono text-xs font-normal">
                        {label}
                      </Badge>
                      {p.description && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{p.description}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7 shrink-0"
                      onClick={() => attach(p.id, label)}
                      disabled={pending === p.id}
                      aria-label={`Add ${label}`}
                    >
                      {pending === p.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                    </Button>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">No permissions defined yet.</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
