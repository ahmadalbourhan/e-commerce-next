"use client"

import { useState } from "react"
import useSWR from "swr"
import { api, swrWrappedFetcher } from "@/lib/api"
import type { CategoryWithProducts } from "@/lib/types"
import { PageHeader } from "@/components/dashboard/page-header"
import { CategoryDialog } from "@/components/categories/category-dialog"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { TableSkeleton, ErrorState, EmptyState } from "@/components/dashboard/data-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, FolderTree } from "lucide-react"

export default function CategoriesPage() {
  const { data, error, isLoading, mutate } = useSWR<CategoryWithProducts[]>("/Category", swrWrappedFetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryWithProducts | null>(null)
  const [deleting, setDeleting] = useState<CategoryWithProducts | null>(null)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(c: CategoryWithProducts) {
    setEditing(c)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await api.del(`/Category/${deleting.id}`)
      toast.success("Category deleted")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categories"
        description="Group your products into categories."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New category
          </Button>
        }
      />

      {isLoading ? (
        <Card className="p-0">
          <TableSkeleton cols={3} />
        </Card>
      ) : error ? (
        <Card className="p-0">
          <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
        </Card>
      ) : !data || data.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            title="No categories yet"
            description="Create your first category to organize products."
            action={
              <Button onClick={openCreate} size="sm">
                <Plus className="size-4" />
                New category
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FolderTree className="size-4.5" />
                  </div>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(c)}>
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(c)}>
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground text-pretty">
                  {c.description || "No description."}
                </p>
              </CardContent>
              <CardFooter>
                <Badge variant="secondary">{c.products?.length ?? 0} products</Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete category"
        description={`Are you sure you want to delete "${deleting?.name}"? Products in this category will not be deleted.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
