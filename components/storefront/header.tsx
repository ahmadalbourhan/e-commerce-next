"use client"

import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useHasOrders } from "@/lib/use-has-orders"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Loader2, Minus, Package, Plus, ShoppingCart, UserRound } from "lucide-react"

type StorefrontHeaderProps = {
  active?: "home" | "shop" | "orders"
  signInNext?: string
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function isAdminRole(role?: string | null) {
  return role === "Admin" || role === "SuperAdmin"
}

export function StorefrontHeader({ active = "home", signInNext = "/checkout" }: StorefrontHeaderProps) {
  const { user, logout } = useAuth()
  const hasOrders = useHasOrders()
  const cart = useCart()
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <>
      <header className="scent-header sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="scent-brand-mark flex size-9 items-center justify-center rounded-md">
              <Package className="size-5" />
            </span>
            Scent
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            <Link href="/shop" className={active === "shop" ? "scent-nav-link-active" : "scent-nav-link"}>
              Products
            </Link>
            {hasOrders && (
              <Link href="/orders" className={active === "orders" ? "scent-nav-link-active" : "scent-nav-link"}>
                Track orders
              </Link>
            )}
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
            <Button variant="outline" size="sm" className="scent-outline" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="size-4" />
              {cart.count > 0 && cart.count}
            </Button>
            {user ? (
              <Button variant="ghost" size="sm" className="text-[#f7e7bd] hover:bg-white/10 hover:text-[#d7b15f]" onClick={logout}>
                <UserRound className="size-4" />
                Sign out
              </Button>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(signInNext)}`} className={cn(buttonVariants({ size: "sm" }), "scent-primary")}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="scent-panel w-[22rem] max-w-[calc(100vw-2rem)] gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-[#d7b15f]/25">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Cart
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {cart.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            ) : (
              cart.items.map((item) => (
                <div key={item.product.id} className="grid grid-cols-[1fr_auto] gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{money(cart.getItemTotal(item.product.id))}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="size-7" onClick={() => item.quantity <= 1 ? cart.removeItem(item.product.id) : cart.updateQuantity(item.product.id, item.quantity - 1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="size-7" disabled={item.quantity >= Number(item.product.stock ?? 0)} onClick={() => cart.updateQuantity(item.product.id, item.quantity + 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <SheetFooter className="border-t border-[#d7b15f]/25">
            <div className="space-y-3">
              <Separator />
              <div className="flex items-center justify-between font-medium">
                <span>Subtotal</span>
                <span className="flex items-center gap-2 tabular-nums">
                  {cart.totalsLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {money(cart.subtotal)}
                </span>
              </div>
              <Link href="/checkout" className={cn(buttonVariants(), "scent-primary w-full", cart.items.length === 0 && "pointer-events-none opacity-50")}>
                Checkout
              </Link>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
