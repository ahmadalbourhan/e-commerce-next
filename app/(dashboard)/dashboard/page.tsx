"use client"

import useSWR from "swr"
import Link from "next/link"
import { getApiAssetUrl, swrWrappedFetcher } from "@/lib/api"
import type { DashboardProduct, DashboardSummary } from "@/lib/types"
import { PageHeader } from "@/components/dashboard/page-header"
import { ErrorState } from "@/components/dashboard/data-states"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, parseBackendDate } from "@/lib/utils"
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  FolderTree,
  Package,
  Plus,
  ReceiptText,
  ShoppingBag,
  Users,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function dateLabel(value?: string | null) {
  if (!value) return "No date"
  const date = parseBackendDate(value)
  return date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date) : "No date"
}

function productImage(product: DashboardProduct) {
  return getApiAssetUrl(product.image) || "/placeholder.jpg"
}

function stockTone(stock?: number | null) {
  if (stock == null) return "bg-muted text-muted-foreground"
  if (stock === 0) return "bg-destructive/10 text-destructive"
  if (stock <= 5) return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
  return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
}

function statusTone(status: string) {
  switch (status.toLowerCase()) {
    case "accepted":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300"
    case "delivered":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "cancelled":
      return "bg-destructive/10 text-destructive"
    default:
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
  }
}

function StatCard({
  title,
  value,
  detail,
  loading,
  icon: Icon,
  href,
}: {
  title: string
  value: number | string
  detail: string
  loading: boolean
  icon: typeof Package
  href: string
}) {
  return (
    <Card className="rounded-lg border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <Skeleton className="h-9 w-20" /> : <div className="text-3xl font-semibold tabular-nums">{value}</div>}
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
          <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
            Open <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const summary = useSWR<DashboardSummary>("/api/Dashboard/summary", swrWrappedFetcher)
  const data = summary.data
  const pendingOrders = data?.orderStatusCounts.pending ?? 0
  const deliveredOrders = data?.orderStatusCounts.delivered ?? 0
  const cancelledOrders = data?.orderStatusCounts.cancelled ?? 0
  const recentOrders = data?.recentOrders ?? []
  const recentProducts = data?.recentProducts ?? []
  const topCategories = data?.topCategories ?? []
  const maxCategoryProducts = Math.max(1, ...topCategories.map((category) => category.productCount))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${user?.fullName?.split(" ")[0] || "Admin"}`}
        description="A clear view of orders, revenue, inventory, and catalog health."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/categories" className={cn(buttonVariants({ variant: "outline" }))}>
              <FolderTree className="size-4" />
              Categories
            </Link>
            <Link href="/products" className={cn(buttonVariants())}>
              <Plus className="size-4" />
              Product
            </Link>
          </div>
        }
      />

      {summary.error && (
        <Card className="rounded-lg p-0">
          <ErrorState
            message="Some dashboard data could not be loaded. Check that the backend is running and your session is valid."
            onRetry={() => {
              summary.mutate()
            }}
          />
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Orders"
          value={data?.totalOrders ?? 0}
          detail={`${pendingOrders} pending review`}
          loading={summary.isLoading}
          icon={ReceiptText}
          href="/dashboard/orders"
        />
        <StatCard
          title="Order Revenue"
          value={currency(data?.orderRevenue ?? 0)}
          detail={`${deliveredOrders} delivered, ${cancelledOrders} cancelled`}
          loading={summary.isLoading}
          icon={CircleDollarSign}
          href="/dashboard/orders"
        />
        <StatCard
          title="Inventory Units"
          value={data?.totalStock ?? 0}
          detail={`${data?.lowStockProducts ?? 0} low stock products`}
          loading={summary.isLoading}
          icon={ShoppingBag}
          href="/products"
        />
        <StatCard
          title="Customers"
          value={data?.activeUsers ?? 0}
          detail="Active user accounts"
          loading={summary.isLoading}
          icon={Users}
          href="/users"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-lg border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Newest customer orders and current fulfillment status.</p>
            </div>
            <Link href="/dashboard/orders" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              View all <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-muted/35">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{order.orderNumber}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{order.username || `User #${order.userId}`}</span>
                      <span>{dateLabel(order.orderedAt)}</span>
                      <span className={cn("rounded px-1.5 py-0.5 font-medium capitalize", statusTone(order.status))}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium tabular-nums">{currency(Number(order.total ?? 0))}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {order.itemCount} items
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <ReceiptText className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm text-muted-foreground">Customer orders will appear here after checkout.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <p className="text-sm text-muted-foreground">Fulfillment distribution across current orders.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)
            ) : (
              [
                ["Pending", pendingOrders],
                ["Delivered", deliveredOrders],
                ["Cancelled", cancelledOrders],
                ["Accepted", data?.orderStatusCounts.accepted ?? 0],
              ].map(([label, count]) => {
                const numericCount = Number(count)
                const width = (data?.totalOrders ?? 0) > 0 ? Math.max(6, (numericCount / (data?.totalOrders ?? 1)) * 100) : 0
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground tabular-nums">{numericCount}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary shadow-sm" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <Card className="rounded-lg border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Products</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Latest catalog additions with price and stock status.</p>
            </div>
            <Link href="/products" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              View all <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
            ) : recentProducts.length > 0 ? (
              recentProducts.map((product) => (
                <div key={product.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-md border bg-card p-2.5 transition-colors hover:bg-muted/35">
                  <img
                    src={productImage(product)}
                    alt={product.name}
                    className="size-14 rounded-md bg-muted object-cover ring-1 ring-foreground/10"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{product.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{product.categoryName || "Uncategorized"}</span>
                      <span>{dateLabel(product.createdAt)}</span>
                      <span className={cn("rounded px-1.5 py-0.5 font-medium", stockTone(product.stock))}>
                        {product.stock ?? 0} in stock
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium tabular-nums">{currency(Number(product.price ?? 0))}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      Margin {Number(product.price ?? 0) > 0 ? (((Number(product.price ?? 0) - Number(product.cost ?? 0)) / Number(product.price ?? 0)) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Boxes className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No products yet</p>
                  <p className="text-sm text-muted-foreground">Create products to start filling this dashboard.</p>
                </div>
                <Link href="/products" className={cn(buttonVariants({ size: "sm" }))}>
                  <Plus className="size-4" />
                  New product
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Category Mix</CardTitle>
            <p className="text-sm text-muted-foreground">Product distribution across your strongest categories.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)
            ) : topCategories.length > 0 ? (
              topCategories.map((category) => {
                const count = category.productCount
                const width = count > 0 ? Math.max(6, (count / maxCategoryProducts) * 100) : 0
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{category.name}</span>
                      <span className="text-muted-foreground tabular-nums">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary shadow-sm"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No categories yet.</p>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Categories</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data?.totalCategories ?? 0}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Empty categories</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data?.emptyCategories ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
