"use client"

import { useState } from "react"
import useSWR from "swr"
import { api, swrFetcher } from "@/lib/api"
import type { Permission } from "@/lib/types"
import { PageHeader } from "@/components/dashboard/page-header"
import { PermissionDialog } from "@/components/permissions/permission-dialog"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { TableSkeleton, ErrorState, EmptyState } from "@/components/dashboard/data-states"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

export default function PermissionsPage() {
  const { data, error, isLoading, mutate } = useSWR<Permission[]>("/api/Permissions", swrFetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Permission | null>(null)
  const [deleting, setDeleting] = useState<Permission | null>(null)

  async function handleDelete() {
    if (!deleting) return
    try {
      await api.del(`/api/Permissions/${deleting.id}`)
      toast.success("Permission deleted")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete permission")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Permissions"
        description="Define the permissions available across the system."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" />
            New permission
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
            title="No permissions yet"
            description="Create your first permission definition."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    {p.slug ? (
                      <Badge variant="secondary" className="font-mono text-xs font-normal">
                        {p.slug}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.description || "—"}</TableCell>
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
                            setEditing(p)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <PermissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permission={editing}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete permission"
        description={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
