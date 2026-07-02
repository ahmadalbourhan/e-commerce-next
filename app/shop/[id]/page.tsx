"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { getApiAssetUrl, swrWrappedFetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useHasOrders } from "@/lib/use-has-orders"
import type { Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StorefrontFooter } from "@/components/storefront/footer"
import { ChevronLeft, Minus, Package, Plus, ShoppingBag, ShoppingCart, UserRound } from "lucide-react"
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
          <Link href="/shop" className="scent-nav-link-active">Products</Link>
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

export default function ProductDetailPage() {
  const params = useParams<{ id: string | string[] }>()
  const router = useRouter()
  const { user } = useAuth()
  const cart = useCart()
  const rawId = params.id
  const productId = Array.isArray(rawId) ? rawId[0] : rawId
  const { data: product, error, isLoading } = useSWR<Product>(
    productId ? `/api/user/products/${productId}` : null,
    swrWrappedFetcher,
  )
  const stock = Number(product?.stock ?? 0)
  const outOfStock = stock <= 0
  const [quantity, setQuantity] = useState(1)

  const cartQuantity = useMemo(
    () => cart.items.find((item) => item.product.id === product?.id)?.quantity ?? 0,
    [cart.items, product?.id],
  )
  const remainingStock = Math.max(0, stock - cartQuantity)
  const maxQuantity = Math.max(1, remainingStock)

  function addToCart() {
    if (!product) return
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/shop/${product.id}`)}`)
      return
    }

    if (outOfStock || remainingStock <= 0) {
      toast.error(outOfStock ? "Product is out of stock" : "No more stock available")
      return
    }

    let addedCount = 0
    for (let index = 0; index < Math.min(quantity, remainingStock); index += 1) {
      if (cart.addItem(product)) addedCount += 1
    }

    if (addedCount > 0) toast.success(addedCount === 1 ? "Added to cart" : `Added ${addedCount} items to cart`)
    else toast.error("No more stock available")
  }

  return (
    <main className="scent-shell min-h-svh">
      <StorefrontHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link href="/shop" className="scent-text-muted mb-5 inline-flex items-center gap-2 text-sm font-medium hover:text-[#0b1b31]">
          <ChevronLeft className="size-4" />
          Back to products
        </Link>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)]">
            <Card className="scent-soft-panel h-[34rem] animate-pulse" />
            <Card className="scent-panel h-[28rem] animate-pulse" />
          </div>
        ) : error || !product ? (
          <Card className="scent-panel p-10 text-center">
            <p className="font-medium">Product not found</p>
            <p className="scent-text-muted mt-1 text-sm">The product may have been removed or is unavailable.</p>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)] lg:items-start">
            <section className="scent-media overflow-hidden rounded-lg border border-[#d7b15f]/25">
              <div className="flex min-h-[24rem] items-center justify-center lg:min-h-[32rem]">
                {product.image || product.imageUrl ? (
                  <img
                    src={getApiAssetUrl(product.image || product.imageUrl)}
                    alt={product.name}
                    className="h-full max-h-[34rem] w-full object-contain"
                  />
                ) : (
                  <Package className="size-16 text-[#b9854d]" />
                )}
              </div>
            </section>

            <section className="scent-panel rounded-lg p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[#d7b15f]/25 bg-[#fffaf0] text-[#53647c]">
                  {product.category?.name ?? "Uncategorized"}
                </Badge>
                {outOfStock ? (
                  <Badge className="bg-destructive/90 text-white">Out of stock</Badge>
                ) : (
                  <Badge className="bg-[#071323] text-[#d7b15f]">{stock} in stock</Badge>
                )}
              </div>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
              {product.description && (
                <p className="scent-text-muted mt-4 leading-7 text-pretty">{product.description}</p>
              )}
              <p className="scent-price mt-4 text-2xl font-semibold tabular-nums">{money(Number(product.price ?? 0))}</p>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-[#0b1b31]">Quantity</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="scent-outline"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      disabled={quantity <= 1 || outOfStock}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="flex h-10 w-14 items-center justify-center rounded-md border border-[#d7b15f]/25 bg-[#fffaf0] text-sm font-medium tabular-nums">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="scent-outline"
                      onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                      disabled={outOfStock || quantity >= maxQuantity}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  {cartQuantity > 0 && (
                    <p className="scent-text-muted mt-2 text-xs">{cartQuantity} already in your cart.</p>
                  )}
                </div>

                <Button
                  size="lg"
                  className="scent-primary w-full"
                  onClick={addToCart}
                  disabled={outOfStock || remainingStock <= 0}
                >
                  <ShoppingBag className="size-4" />
                  {outOfStock ? "Out of stock" : remainingStock <= 0 ? "Stock already in cart" : "Add to cart"}
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
      <StorefrontFooter />
    </main>
  )
}
