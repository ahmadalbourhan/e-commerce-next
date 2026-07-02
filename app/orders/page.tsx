"use client"

import Link from "next/link"
import useSWR from "swr"
import { swrWrappedFetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { Order } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StorefrontFooter } from "@/components/storefront/footer"
import { StorefrontHeader } from "@/components/storefront/header"
import { cn, parseBackendDate } from "@/lib/utils"
import { PackageCheck } from "lucide-react"

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function dateLabel(value?: string | null) {
  if (!value) return "-"
  const date = parseBackendDate(value)
  return date ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date) : "-"
}

export default function OrdersPage() {
  const { user, loading } = useAuth()
  const orders = useSWR<Order[]>(user ? "/api/user/orders" : null, swrWrappedFetcher)

  if (!loading && !user) {
    return (
      <main className="scent-shell flex min-h-svh flex-col">
        <StorefrontHeader active="orders" signInNext="/orders" />
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
      <StorefrontHeader active="orders" signInNext="/orders" />
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
