"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { api, swrFetcher, swrWrappedFetcher } from "@/lib/api"
import type { Order, PagedResult, User } from "@/lib/types"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState, ErrorState, TableSkeleton } from "@/components/dashboard/data-states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, parseBackendDate } from "@/lib/utils"
import { ChevronLeft, ChevronRight, ClipboardList, Eye, MoreHorizontal, Search } from "lucide-react"
import { toast } from "sonner"

const statuses = ["Pending", "Accepted", "Delivered", "Cancelled"]
const pageSize = 10

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function dateTime(value?: string | null) {
  if (!value) return "-"
  const date = parseBackendDate(value)
  if (!date) return "-"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "accepted":
      return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300"
    case "delivered":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "cancelled":
      return "border-destructive/25 bg-destructive/10 text-destructive"
    default:
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }
}

function DashboardOrdersContent() {
  const router = useRouter()
  const params = useSearchParams()
  const page = Math.max(1, Number(params.get("page") ?? 1))
  const status = params.get("status") ?? "all"
  const search = params.get("search") ?? ""
  const paramsString = params.toString()
  const [query, setQuery] = useState(search)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const ordersPath = useMemo(() => {
    const queryParams = new URLSearchParams()
    queryParams.set("page", String(page))
    queryParams.set("pageSize", String(pageSize))
    if (search) queryParams.set("search", search)
    if (status !== "all") queryParams.set("status", status)
    return `/Order/paged?${queryParams.toString()}`
  }, [page, search, status])

  const { data, error, isLoading, mutate } = useSWR<PagedResult<Order>>(ordersPath, swrWrappedFetcher)
  const selectedUser = useSWR<User>(
    selectedOrder ? `/api/Users/${selectedOrder.userId}` : null,
    swrFetcher,
  )
  const orders = data?.items ?? []

  useEffect(() => {
    setQuery(search)
  }, [search])

  useEffect(() => {
    const nextSearch = query.trim()
    if (nextSearch === search) return

    const timeout = window.setTimeout(() => {
      const nextParams = new URLSearchParams(paramsString)
      if (nextSearch) nextParams.set("search", nextSearch)
      else nextParams.delete("search")
      nextParams.set("page", "1")
      router.push(`/dashboard/orders?${nextParams.toString()}`)
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
    router.push(`/dashboard/orders?${queryParams.toString()}`)
  }

  async function updateStatus(order: Order, status: string) {
    if (order.status === status) return

    setUpdatingId(order.id)
    try {
      await api.sendWrapped<Order>(`/Order/${order.id}/status`, "PATCH", { status })
      toast.success("Order status updated")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="Review customer orders and update fulfillment status."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => updateParams({ status: value ?? "all" })}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status">
              {(value) => value === "all" ? "All statuses" : String(value)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="All statuses">All statuses</SelectItem>
            {statuses.map((item) => (
              <SelectItem key={item} value={item} label={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : error ? (
          <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
        ) : orders.length === 0 ? (
          <EmptyState
            title={query || status !== "all" ? "No matching orders" : "No orders yet"}
            description={query || status !== "all" ? "Try a different search or status." : "Customer orders will appear here after checkout."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const customer = order.user?.username || `User #${order.userId}`
                const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">{order.paymentMethod}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{customer}</div>
                      <div className="text-xs text-muted-foreground">ID {order.userId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="size-4 text-muted-foreground" />
                        <span className="tabular-nums">{itemCount}</span>
                      </div>
                      <div className="max-w-60 truncate text-xs text-muted-foreground">
                        {order.items.map((item) => item.productName).join(", ") || "No items"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize", statusClass(order.status))}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{dateTime(order.orderedAt)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(Number(order.total ?? 0))}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" disabled={updatingId === order.id}>
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                            <Eye className="size-4" />
                            View details
                          </DropdownMenuItem>
                          {statuses.map((status) => (
                            <DropdownMenuItem key={status} onClick={() => updateStatus(order, status)}>
                              Mark {status}
                            </DropdownMenuItem>
                          ))}
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

      {data && data.totalItems > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {orders.length} of {data.totalItems} orders
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

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="!w-[96vw] !max-w-[96vw] max-h-[92vh] overflow-hidden p-0">
          {selectedOrder && (
            <>
              {(() => {
                const customerPhone = selectedUser.data?.phoneNumber || selectedOrder.user?.phoneNumber || "-"

                return (
                  <>
              <DialogHeader className="border-b px-5 py-5 sm:px-7">
                <DialogTitle className="text-lg">Order {selectedOrder.orderNumber}</DialogTitle>
                <DialogDescription>
                  Full order details, customer information, items, and fulfillment dates.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[calc(92vh-108px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(150px,0.8fr)_minmax(0,1.2fr)]">
                  <div className="min-w-0 rounded-lg border bg-muted/20 p-5">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Customer</div>
                    <div className="mt-3 min-w-0 break-words text-base font-semibold leading-snug">
                      {selectedOrder.user?.username || `User #${selectedOrder.userId}`}
                    </div>
                    <div className="mt-1 break-words text-sm text-muted-foreground">
                      Phone: {selectedUser.isLoading ? "Loading..." : customerPhone}
                    </div>
                    <div className="text-sm text-muted-foreground">ID {selectedOrder.userId}</div>
                  </div>
                  <div className="min-w-0 rounded-lg border bg-muted/20 p-5">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Status</div>
                    <Badge variant="outline" className={cn("mt-3 max-w-full capitalize", statusClass(selectedOrder.status))}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="min-w-0 rounded-lg border bg-muted/20 p-5">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Payment</div>
                    <div className="mt-3 min-w-0 break-words text-base font-semibold leading-snug">
                      {selectedOrder.paymentMethod || "-"}
                    </div>
                    <div className="text-sm text-muted-foreground">Total {money(Number(selectedOrder.total ?? 0))}</div>
                  </div>
                </div>

                <div className="grid gap-4 rounded-lg border p-5 text-sm lg:grid-cols-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Ordered</div>
                    <div className="mt-2 break-words font-medium">{dateTime(selectedOrder.orderedAt)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Accepted</div>
                    <div className="mt-2 break-words font-medium">{dateTime(selectedOrder.acceptedAt)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Delivered</div>
                    <div className="mt-2 break-words font-medium">{dateTime(selectedOrder.deliveredAt)}</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit price</TableHead>
                        <TableHead className="text-right">Line total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-xs text-muted-foreground">Product #{item.productId}</div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                            <TableCell className="text-right tabular-nums">{money(Number(item.unitPrice ?? 0))}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {money(Number(item.totalPrice ?? 0))}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                            No items found for this order.
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-semibold">
                          Order total
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {money(Number(selectedOrder.total ?? 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
                  </>
                )
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardOrdersPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading orders...</div>}>
      <DashboardOrdersContent />
    </Suspense>
  )
}
