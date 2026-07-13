"use client"

import { useDeferredValue, useMemo, useState } from "react"
import useSWR from "swr"
import { api, swrFetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { User, Role } from "@/lib/types"
import { PageHeader } from "@/components/dashboard/page-header"
import { UserDialog } from "@/components/users/user-dialog"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { TableSkeleton, ErrorState, EmptyState } from "@/components/dashboard/data-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Shield } from "lucide-react"

function initials(name?: string | null, email?: string) {
  const base = name?.trim() || email || "?"
  const parts = base.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "")
}

function isSuperAdmin(user: User) {
  return user.roleName === "SuperAdmin" || user.roles?.includes("SuperAdmin")
}

export default function UsersPage() {
  const { refreshUser } = useAuth()
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const usersUrl = useMemo(() => {
    const search = deferredQuery.trim()
    return search ? `/api/Users?search=${encodeURIComponent(search)}` : "/api/Users"
  }, [deferredQuery])
  const { data, error, isLoading, mutate } = useSWR<User[]>(usersUrl, swrFetcher)
  const { data: roles } = useSWR<Role[]>("/api/Roles", swrFetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [assigningRole, setAssigningRole] = useState<number | null>(null)

  const roleMap = useMemo(() => {
    const m = new Map<number, string>()
    roles?.forEach((r) => m.set(r.id, r.name))
    return m
  }, [roles])

  async function handleDelete() {
    if (!deleting) return
    if (isSuperAdmin(deleting)) {
      toast.error("The Super Admin account cannot be deleted.")
      setDeleting(null)
      return
    }

    try {
      await api.del(`/api/Users/${deleting.id}`)
      toast.success("User deleted")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  async function assignRole(user: User, roleId: number) {
    setAssigningRole(user.id)
    try {
      await api.post(`/api/Users/${user.id}/roles`, { roleId })
      toast.success(`Assigned role to ${user.fullName || user.email}`)
      mutate()
      await refreshUser()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign role")
    } finally {
      setAssigningRole(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accounts"
        description="Manage all users and admins from one place."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" />
            New account
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={3} />
        ) : error ? (
          <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={query ? "No matching accounts" : "No accounts yet"}
            description={query ? "Try a different search." : "Create your first account."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => {
                const superAdmin = isSuperAdmin(u)

                return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {initials(u.fullName, u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.fullName || "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.roleName ? (
                      <Badge variant="secondary">{u.roleName}</Badge>
                    ) : u.roleId != null && roleMap.get(u.roleId) ? (
                      <Badge variant="secondary">{roleMap.get(u.roleId)}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No role</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(u)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Shield className="size-4" />
                            Assign role
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup
                              value={u.roleId != null ? String(u.roleId) : ""}
                              onValueChange={(v) => assignRole(u, Number(v))}
                            >
                              {roles && roles.length > 0 ? (
                                roles.map((r) => (
                                  <DropdownMenuRadioItem
                                    key={r.id}
                                    value={String(r.id)}
                                    disabled={assigningRole === u.id}
                                  >
                                    {r.name}
                                  </DropdownMenuRadioItem>
                                ))
                              ) : (
                                <DropdownMenuItem disabled>No roles available</DropdownMenuItem>
                              )}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={superAdmin}
                          onClick={() => {
                            if (superAdmin) {
                              toast.error("The Super Admin account cannot be deleted.")
                              return
                            }
                            setDeleting(u)
                          }}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
        roles={roles ?? []}
        onSaved={() => {
          mutate()
          void refreshUser()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete account"
        description={`Are you sure you want to delete ${deleting?.fullName || deleting?.email}? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
