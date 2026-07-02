"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import { getApiAssetUrl, swrWrappedFetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useHasOrders } from "@/lib/use-has-orders"
import type { CategoryWithProducts, PagedResult, Product } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StorefrontFooter } from "@/components/storefront/footer"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Package, Search, ShoppingBag, ShoppingCart, UserRound } from "lucide-react"
import { toast } from "sonner"

const pageSize = 12

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function isAdminRole(role?: string | null) {
  return role === "Admin" || role === "SuperAdmin"
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const outOfStock = Number(product.stock ?? 0) <= 0

  return (
    <Card className="scent-card group relative overflow-hidden rounded-lg pt-0 transition-shadow">
      {outOfStock && (
        <Badge className="absolute left-3 top-3 z-10 bg-destructive/90 text-white">
          Out of stock
        </Badge>
      )}
      <Button
        size="icon"
        className="scent-dark-button absolute right-3 top-3 z-10 size-9 opacity-0 shadow-lg transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        onClick={() => onAdd(product)}
        disabled={outOfStock}
        aria-label={`Add ${product.name} to cart`}
      >
        <ShoppingBag className="size-4" />
      </Button>
      <Link href={`/shop/${product.id}`} className="block">
        <div className="scent-media h-72 overflow-hidden">
          {product.image || product.imageUrl ? (
            <img src={getApiAssetUrl(product.image || product.imageUrl)} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          ) : (
            <div className="flex h-full items-center justify-center text-[#b9854d]">
              <Package className="size-10" />
            </div>
          )}
        </div>
        <CardHeader className="gap-3 pt-3">
          <CardTitle className="line-clamp-1 text-base font-medium">{product.name}</CardTitle>
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className="border-[#d7b15f]/25 bg-[#fffaf0] text-[#53647c]">{product.category?.name ?? "Uncategorized"}</Badge>
            <span className="scent-price font-semibold tabular-nums">{money(Number(product.price ?? 0))}</span>
          </div>
          <span className="scent-text-muted text-xs">{product.stock ?? 0} in stock</span>
        </CardHeader>
      </Link>
    </Card>
  )
}

function ShopPageContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, logout } = useAuth()
  const hasOrders = useHasOrders()
  const cart = useCart()
  const [searchInput, setSearchInput] = useState(params.get("search") ?? "")

  const page = Math.max(1, Number(params.get("page") ?? 1))
  const categoryId = params.get("categoryId") ?? "all"
  const sort = params.get("sort") ?? "recent"
  const search = params.get("search") ?? ""
  const paramsString = params.toString()

  const productsPath = useMemo(() => {
    const query = new URLSearchParams()
    query.set("page", String(page))
    query.set("pageSize", String(pageSize))
    if (search) query.set("search", search)
    if (categoryId !== "all") query.set("categoryId", categoryId)
    if (sort) query.set("sort", sort)
    return `/api/user/products/paged?${query.toString()}`
  }, [categoryId, page, search, sort])

  const products = useSWR<PagedResult<Product>>(productsPath, swrWrappedFetcher)
  const categories = useSWR<CategoryWithProducts[]>("/api/user/categories", swrWrappedFetcher)
  const result = products.data

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    const nextSearch = searchInput.trim()
    if (nextSearch === search) return

    const timeout = window.setTimeout(() => {
      const query = new URLSearchParams(paramsString)
      if (nextSearch) query.set("search", nextSearch)
      else query.delete("search")
      query.set("page", "1")
      router.push(`/shop?${query.toString()}`)
    }, 2000)

    return () => window.clearTimeout(timeout)
  }, [paramsString, router, search, searchInput])

  function updateParams(next: Record<string, string | null>) {
    const query = new URLSearchParams(params.toString())
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "all") query.delete(key)
      else query.set(key, value)
    })
    if (!("page" in next)) query.set("page", "1")
    router.push(`/shop?${query.toString()}`)
  }

  function addProduct(product: Product) {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/shop?${paramsString}`)}`)
      return
    }

    const added = cart.addItem(product)
    if (added) toast.success("Added to cart")
    else toast.error(Number(product.stock ?? 0) <= 0 ? "Product is out of stock" : "No more stock available")
  }

  return (
    <main className="scent-shell min-h-svh">
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

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0b1b31]">Products</h1>
            <p className="scent-text-muted mt-2 text-sm">Search and filter products directly from the backend catalog.</p>
          </div>
          <div className="relative sm:w-80">
            <Search className="scent-text-muted absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products"
              className="scent-input pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Select value={categoryId} onValueChange={(value) => updateParams({ categoryId: value ?? "all" })}>
                <SelectTrigger className="scent-input w-48">
                <SelectValue placeholder="Category">
                  {(value) =>
                    value === "all"
                      ? "All categories"
                      : categories.data?.find((category) => String(category.id) === String(value))?.name ?? "Category"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="All categories">All categories</SelectItem>
                {(categories.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={String(category.id)} label={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => updateParams({ sort: value ?? "recent" })}>
                <SelectTrigger className="scent-input w-48">
                <SelectValue placeholder="Sort">
                  {(value) => {
                    if (value === "price_asc") return "Price from low to high"
                    if (value === "price_desc") return "Price from high to low"
                    return "Recent items"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent" label="Recent items">Recent items</SelectItem>
                <SelectItem value="price_asc" label="Price from low to high">Price from low to high</SelectItem>
                <SelectItem value="price_desc" label="Price from high to low">Price from high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="scent-text-muted text-sm">
            {result ? `${result.totalItems} products` : "Loading products..."}
          </p>
        </div>

        {products.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: pageSize }).map((_, index) => <Card key={index} className="scent-soft-panel h-96 animate-pulse" />)}
          </div>
        ) : products.error ? (
          <Card className="p-6 text-sm text-destructive">Could not load products.</Card>
        ) : !result || result.items.length === 0 ? (
          <Card className="scent-panel p-10 text-center">
            <p className="font-medium">No products found</p>
            <p className="scent-text-muted mt-1 text-sm">Try changing the search or filter.</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={addProduct} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                className="scent-outline"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-sm text-[#5f6878]">
                Page {result.page} of {Math.max(1, result.totalPages)}
              </span>
              <Button
                variant="outline"
                className="scent-outline"
                disabled={page >= result.totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>
      <StorefrontFooter />
    </main>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={<main className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Loading products...</main>}>
      <ShopPageContent />
    </Suspense>
  )
}
