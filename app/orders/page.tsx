"use client"

import Link from "next/link"
import useSWR from "swr"
import { swrWrappedFetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useHasOrders } from "@/lib/use-has-orders"
import type { Order } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StorefrontFooter } from "@/components/storefront/footer"
import { cn, parseBackendDate } from "@/lib/utils"
import { Package, PackageCheck, ShoppingCart, UserRound } from "lucide-react"

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function dateLabel(value?: string | null) {
  if (!value) return "-"
  const date = parseBackendDate(value)
  return date ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date) : "-"
}

function isAdminRole(role?: string | null) {
  return role === "Admin" || role === "SuperAdmin"
}

function StorefrontHeader() {
  const { user, logout } = useAuth()
  const hasOrders = useHasOrders()
  const cart = useCart()

  return (
    <header className="scent-header sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="scent-brand-mark flex size-9 items-center justify-center rounded-md">
            <Package className="size-5" />
          </span>
          Scent
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          <Link href="/shop" className="scent-nav-link">Products</Link>
          {hasOrders && <Link href="/orders" className="scent-nav-link-active">Track orders</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {isAdminRole(user?.role) && (
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "scent-outline")}>
              Dashboard
            </Link>
          )}
          {hasOrders && (
            <Link href="/orders" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-[#d7b15f] hover:bg-transparent hover:text-[#f7e7bd] md:hidden")}>
              Track orders
            </Link>
          )}
          <Link href="/checkout" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "scent-outline")}>
            <ShoppingCart className="size-4" />
            {cart.count > 0 && cart.count}
          </Link>
          {user ? (
            <Button variant="ghost" size="sm" className="text-[#f7e7bd] hover:bg-white/10 hover:text-[#d7b15f]" onClick={logout}>
              <UserRound className="size-4" />
              Sign out
            </Button>
          ) : (
            <Link href="/login?next=/orders" className={cn(buttonVariants({ size: "sm" }), "scent-primary")}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default function OrdersPage() {
  const { user, loading } = useAuth()
  const orders = useSWR<Order[]>(user ? "/api/user/orders" : null, swrWrappedFetcher)

  if (!loading && !user) {
    return (
      <main className="scent-shell flex min-h-svh flex-col">
        <StorefrontHeader />
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="scent-panel w-full max-w-sm text-center">
            <CardHeader>
              <CardTitle>Sign in to track orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/login?next=/orders" className={cn(buttonVariants(), "scent-primary w-full")}>Sign in</Link>
            </CardContent>
          </Card>
        </div>
        <StorefrontFooter />
      </main>
    )
  }

  return (
    <main className="scent-shell flex min-h-svh flex-col">
      <StorefrontHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" className="scent-outline" onClick={() => orders.mutate()}>Refresh</Button>
        </div>
        <Card className="scent-panel rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-5" />
              Your orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orders.isLoading || loading ? (
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            ) : orders.data && orders.data.length > 0 ? (
              orders.data.map((order) => (
                <div key={order.id} className="scent-soft-panel rounded-md border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">Ordered {dateLabel(order.orderedAt)}</p>
                    </div>
                    <div className="text-right">
                      <Badge>{order.status}</Badge>
                      <p className="mt-1 font-semibold tabular-nums">{money(Number(order.total ?? 0))}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <span>Accepted: {dateLabel(order.acceptedAt)}</span>
                    <span>Delivered: {dateLabel(order.deliveredAt)}</span>
                    <span>Payment: Cash on delivery</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <StorefrontFooter />
    </main>
  )
}
