"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api, getApiAssetUrl } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useHasOrders } from "@/lib/use-has-orders"
import type { Order } from "@/lib/types"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StorefrontFooter } from "@/components/storefront/footer"
import { cn } from "@/lib/utils"
import { Loader2, Package, ShoppingCart, UserRound } from "lucide-react"
import { toast } from "sonner"

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
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
          {hasOrders && <Link href="/orders" className="scent-nav-link">Track orders</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {isAdminRole(user?.role) && (
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "scent-outline")}>
              Dashboard
            </Link>
          )}
          {hasOrders && (
            <Link href="/orders" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-[#f7e7bd] hover:bg-transparent hover:text-[#d7b15f] md:hidden")}>
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
            <Link href="/login?next=/checkout" className={cn(buttonVariants({ size: "sm" }), "scent-primary")}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const cart = useCart()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/checkout")
  }, [loading, user, router])

  async function placeOrder() {
    if (cart.items.length === 0) return
    const invalidItem = cart.items.find((item) => item.quantity > Number(item.product.stock ?? 0))
    if (invalidItem) {
      toast.error(`Only ${invalidItem.product.stock ?? 0} left for ${invalidItem.product.name}`)
      return
    }

    setSubmitting(true)
    try {
      const order = await api.sendWrapped<Order>("/api/user/orders", "POST", {
        paymentMethod: "CashOnDelivery",
        items: cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      })
      cart.clear()
      toast.success("Order placed")
      router.replace(`/orders?orderId=${order.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to place order")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <main className="scent-shell flex min-h-svh flex-col">
        <StorefrontHeader />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Checking your session...</div>
        <StorefrontFooter />
      </main>
    )
  }

  return (
    <main className="scent-shell flex min-h-svh flex-col">
      <StorefrontHeader />
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">
        <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "w-fit text-[#0b1b31] hover:bg-[#f1dfbd] hover:text-[#071323]")}>Back to store</Link>
        <Card className="scent-panel rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Checkout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.items.length === 0 ? (
              <div className="py-10 text-center">
                <p className="font-medium">Your cart is empty.</p>
                <Link href="/" className={cn(buttonVariants({ size: "sm" }), "scent-primary mt-4")}>Shop products</Link>
              </div>
            ) : (
              <>
                {cart.items.map((item) => (
                  <div key={item.product.id} className="grid grid-cols-[4rem_1fr_auto] items-center gap-3">
                    <div className="scent-media size-16 overflow-hidden rounded-md">
                      {item.product.image || item.product.imageUrl ? (
                        <img src={getApiAssetUrl(item.product.image || item.product.imageUrl)} alt={item.product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground"><Package className="size-5" /></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">Qty {item.quantity} x {money(Number(item.product.price ?? 0))}</p>
                    </div>
                    <div className="font-medium tabular-nums">{money(cart.getItemTotal(item.product.id))}</div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{money(cart.subtotal)}</span>
                </div>
                <div className="scent-soft-panel rounded-md border p-3 text-sm">
                  Payment method: <span className="font-medium">Cash on delivery</span>
                </div>
                <Button className="scent-primary w-full" onClick={placeOrder} disabled={submitting || cart.items.some((item) => item.quantity > Number(item.product.stock ?? 0))}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Place order
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <StorefrontFooter />
    </main>
  )
}
