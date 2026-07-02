"use client"

import { useState } from "react"
import useSWR from "swr"
import { api, swrFetcher } from "@/lib/api"
import type { Role } from "@/lib/types"
import { PageHeader } from "@/components/dashboard/page-header"
import { RoleDialog } from "@/components/roles/role-dialog"
import { RolePermissionsSheet } from "@/components/roles/role-permissions-sheet"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { TableSkeleton, ErrorState, EmptyState } from "@/components/dashboard/data-states"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, KeyRound } from "lucide-react"

function isSuperAdminRole(role?: Role | null) {
  return role?.name === "SuperAdmin"
}

export default function RolesPage() {
  const { data, error, isLoading, mutate } = useSWR<Role[]>("/api/Roles", swrFetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [permsRole, setPermsRole] = useState<Role | null>(null)
  const [permsOpen, setPermsOpen] = useState(false)

  async function handleDelete() {
    if (!deleting) return
    if (isSuperAdminRole(deleting)) {
      toast.error("The Super Admin role cannot be deleted.")
      setDeleting(null)
      return
    }

    try {
      await api.del(`/api/Roles/${deleting.id}`)
      toast.success("Role deleted")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        description="Define roles and attach permissions to them."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" />
            New role
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={3} />
        ) : error ? (
          <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No roles yet"
            description="Create your first role to group permissions."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => {
                const superAdmin = isSuperAdminRole(r)

                return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.description || "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(r)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setPermsRole(r)
                            setPermsOpen(true)
                          }}
                        >
                          <KeyRound className="size-4" />
                          Permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={superAdmin}
                          onClick={() => {
                            if (superAdmin) {
                              toast.error("The Super Admin role cannot be deleted.")
                              return
                            }
                            setDeleting(r)
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

      <RoleDialog open={dialogOpen} onOpenChange={setDialogOpen} role={editing} onSaved={() => mutate()} />

      <RolePermissionsSheet role={permsRole} open={permsOpen} onOpenChange={setPermsOpen} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete role"
        description={`Are you sure you want to delete the "${deleting?.name}" role? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
