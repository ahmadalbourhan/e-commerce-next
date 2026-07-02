"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { api, getApiAssetUrl, swrWrappedFetcher } from "@/lib/api"
import type { Product, CategoryWithProducts, PagedResult } from "@/lib/types"
import { PageHeader } from "@/components/dashboard/page-header"
import { ProductDialog } from "@/components/products/product-dialog"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { TableSkeleton, ErrorState, EmptyState } from "@/components/dashboard/data-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

const pageSize = 10

function ProductsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const page = Math.max(1, Number(params.get("page") ?? 1))
  const search = params.get("search") ?? ""
  const categoryId = params.get("categoryId") ?? "all"
  const sort = params.get("sort") ?? "recent"
  const paramsString = params.toString()
  const [query, setQuery] = useState(search)

  const productPath = useMemo(() => {
    const queryParams = new URLSearchParams()
    queryParams.set("page", String(page))
    queryParams.set("pageSize", String(pageSize))
    if (search) queryParams.set("search", search)
    if (categoryId !== "all") queryParams.set("categoryId", categoryId)
    if (sort) queryParams.set("sort", sort)
    return `/Product/paged?${queryParams.toString()}`
  }, [categoryId, page, search, sort])

  const { data, error, isLoading, isValidating, mutate } = useSWR<PagedResult<Product>>(productPath, swrWrappedFetcher, {
    keepPreviousData: false,
  })
  const { data: categories } = useSWR<CategoryWithProducts[]>("/Category", swrWrappedFetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const categoryMap = useMemo(() => {
    const m = new Map<number, string>()
    categories?.forEach((c) => m.set(c.id, c.name))
    return m
  }, [categories])

  const products = data?.items ?? []
  const showSkeleton = isLoading || isValidating

  useEffect(() => {
    setQuery(search)
  }, [search])

  useEffect(() => {
    const nextSearch = query.trim()
    if (nextSearch === search) return

    const timeout = window.setTimeout(() => {
      const queryParams = new URLSearchParams(paramsString)
      if (nextSearch) queryParams.set("search", nextSearch)
      else queryParams.delete("search")
      queryParams.set("page", "1")
      router.push(`/products?${queryParams.toString()}`)
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [paramsString, query, router, search])

  function updateParams(next: Record<string, string | null>) {
    const queryParams = new URLSearchParams(params.toString())
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "all") queryParams.delete(key)
      else queryParams.set(key, value)
    })
    if (!("page" in next)) queryParams.set("page", "1")
    router.push(`/products?${queryParams.toString()}`)
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(p: Product) {
    setEditing(p)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await api.del(`/Product/${deleting.id}`)
      toast.success("Product deleted")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="Manage your store catalog."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New product
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryId} onValueChange={(value) => updateParams({ categoryId: value ?? "all" })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category">
                {(value) =>
                  value === "all"
                    ? "All categories"
                    : categories?.find((category) => String(category.id) === String(value))?.name ?? "Category"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All categories">All categories</SelectItem>
              {(categories ?? []).map((category) => (
                <SelectItem key={category.id} value={String(category.id)} label={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => updateParams({ sort: value ?? "recent" })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort">
                {(value) => {
                  if (value === "price_asc") return "Price low to high"
                  if (value === "price_desc") return "Price high to low"
                  if (value === "stock_asc") return "Stock low to high"
                  if (value === "stock_desc") return "Stock high to low"
                  return "Recent items"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent" label="Recent items">Recent items</SelectItem>
              <SelectItem value="price_asc" label="Price low to high">Price low to high</SelectItem>
              <SelectItem value="price_desc" label="Price high to low">Price high to low</SelectItem>
              <SelectItem value="stock_asc" label="Stock low to high">Stock low to high</SelectItem>
              <SelectItem value="stock_desc" label="Stock high to low">Stock high to low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {showSkeleton ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
        ) : products.length === 0 ? (
          <EmptyState
            title={query || categoryId !== "all" ? "No matching products" : "No products yet"}
            description={query || categoryId !== "all" ? "Try a different search or filter." : "Create your first product to get started."}
            action={
              !query && categoryId === "all" && (
                <Button onClick={openCreate} size="sm">
                  <Plus className="size-4" />
                  New product
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description && (
                      <div className="max-w-xs truncate text-xs text-muted-foreground">{p.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.image || p.imageUrl ? (
                      <img
                        src={getApiAssetUrl(p.image || p.imageUrl)}
                        alt={p.name}
                        className="size-12 rounded-md object-cover"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.category?.name || (p.categoryId != null && categoryMap.get(p.categoryId)) ? (
                      <Badge variant="secondary">{p.category?.name ?? categoryMap.get(p.categoryId ?? 0)}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${Number(p.price ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.stock != null ? p.stock : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
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

      {data && data.totalItems > 0 && !showSkeleton && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {products.length} of {data.totalItems} products
          </p>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {data.page} of {Math.max(1, data.totalPages)}
            </span>
            <Button
              variant="outline"
              disabled={page >= data.totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        categories={categories ?? []}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete product"
        description={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  )
}
