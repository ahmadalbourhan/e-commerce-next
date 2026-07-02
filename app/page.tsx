"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { getApiAssetUrl, swrWrappedFetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import type { CategoryWithProducts, Product } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { StorefrontFooter } from "@/components/storefront/footer"
import { StorefrontHeader } from "@/components/storefront/header"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Package, ShoppingBag } from "lucide-react"
import { toast } from "sonner"

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

const slides = [
  {
    title: "Scent",
    description: "Curated perfumes with rich trails, elegant bottles, and a presence that stays with you.",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2400&h=1200&q=90",
    imagePosition: "center 56%",
    tone: "Signature fragrance",
  },
  {
    title: "Fresh Rituals",
    description: "Clean, refined scents selected for everyday confidence and quiet luxury.",
    image: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=2400&h=1200&q=90",
    imagePosition: "center 52%",
    tone: "Daily essentials",
  },
]

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const outOfStock = Number(product.stock ?? 0) <= 0

  return (
    <Card className="scent-card group relative flex h-[25rem] w-64 shrink-0 flex-col overflow-hidden rounded-lg pt-0 transition-shadow sm:w-72">
      {outOfStock && (
        <Badge className="absolute left-3 top-3 z-10 bg-destructive/90 text-white">
          Out of stock
        </Badge>
      )}
      <Button
        size="icon"
        className="absolute right-3 top-3 z-10 size-9 bg-[#9a742d] text-white opacity-0 shadow-lg transition-opacity hover:bg-[#876526] hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
        onClick={() => onAdd(product)}
        disabled={outOfStock}
        aria-label={`Add ${product.name} to cart`}
      >
        <ShoppingBag className="size-4" />
      </Button>
      <Link href={`/shop/${product.id}`} className="block min-h-0 flex-1">
        <div className="scent-media h-[19rem] w-full overflow-hidden">
          {product.image || product.imageUrl ? (
            <img src={getApiAssetUrl(product.image || product.imageUrl)} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          ) : (
            <div className="flex h-full items-center justify-center text-[#b9854d]">
              <Package className="size-10" />
            </div>
          )}
        </div>
        <CardHeader className="min-h-0 justify-between gap-2 pt-3">
          <CardTitle className="line-clamp-1 text-base font-medium">{product.name}</CardTitle>
          {product.description && (
            <p className="scent-text-muted line-clamp-2 text-xs">{product.description}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="scent-price font-semibold tabular-nums">{money(Number(product.price ?? 0))}</span>
            <span className="scent-text-muted text-xs">{product.stock ?? 0} in stock</span>
          </div>
        </CardHeader>
      </Link>
    </Card>
  )
}

function ProductCarousel({
  products,
  onAdd,
}: {
  products: Product[]
  onAdd: (product: Product) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const shouldLoop = products.length >= 5
  const carouselProducts = shouldLoop ? [...products, ...products, ...products] : products

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !shouldLoop) return

    requestAnimationFrame(() => {
      scroller.scrollLeft = scroller.scrollWidth / 3
    })
  }, [products.length, shouldLoop])

  function keepLoopPosition() {
    const scroller = scrollerRef.current
    if (!scroller || !shouldLoop) return

    const segmentWidth = scroller.scrollWidth / 3
    if (scroller.scrollLeft < segmentWidth * 0.5) {
      scroller.scrollLeft += segmentWidth
    } else if (scroller.scrollLeft > segmentWidth * 1.5) {
      scroller.scrollLeft -= segmentWidth
    }
  }

  function scroll(direction: "left" | "right") {
    scrollerRef.current?.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative min-w-0 rounded-lg border border-[#d7b15f]/20 bg-[linear-gradient(135deg,rgba(255,253,248,0.78)_0%,rgba(241,223,189,0.52)_100%)] p-4 shadow-[0_18px_45px_rgba(25,32,45,0.08)]">
      {products.length >= 5 && (
        <div className="mb-3 flex justify-end gap-2">
          <Button variant="outline" size="icon" className="scent-outline" onClick={() => scroll("left")}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="scent-outline" onClick={() => scroll("right")}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
      <div
        ref={scrollerRef}
        onScroll={keepLoopPosition}
        className="flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {carouselProducts.map((product, index) => (
          <div key={`${product.id}-${index}`} className="shrink-0 snap-start">
            <ProductCard product={product} onAdd={onAdd} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StorefrontPage() {
  const router = useRouter()
  const { user } = useAuth()
  const cart = useCart()
  const categories = useSWR<CategoryWithProducts[]>("/api/user/categories", swrWrappedFetcher)
  const [slideIndex, setSlideIndex] = useState(0)

  const activeSlide = slides[slideIndex]

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [])

  function addProduct(product: Product) {
    if (!user) {
      router.push("/login?next=/")
      return
    }

    const added = cart.addItem(product)
    if (added) toast.success("Added to cart")
    else toast.error(Number(product.stock ?? 0) <= 0 ? "Product is out of stock" : "No more stock available")
  }

  return (
    <main className="scent-shell min-h-svh">
      <StorefrontHeader active="home" signInNext="/checkout" />

      <section className="relative isolate overflow-hidden border-b border-[#d7b15f]/20 bg-[#061221]">
        <div className="absolute inset-0">
          <img
            key={activeSlide.image}
            src={activeSlide.image}
            alt={activeSlide.title}
            className="h-full w-full object-cover opacity-95 transition-opacity duration-700"
            style={{ objectPosition: activeSlide.imagePosition }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,13,24,0.96)_0%,rgba(6,18,33,0.86)_34%,rgba(6,18,33,0.32)_68%,rgba(6,18,33,0.12)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_52%,rgba(215,177,95,0.16),transparent_24rem)]" />
        </div>
        <div className="relative mx-auto flex min-h-[68svh] max-w-7xl flex-col justify-end px-4 py-10 sm:min-h-[74svh] sm:py-14">
          <div className="max-w-2xl border-l border-[#d7b15f]/45 pl-5 sm:pl-7">
            <Badge variant="outline" className="mb-4 w-fit border-[#d7b15f]/45 bg-black/20 text-[#f7e7bd]">{activeSlide.tone}</Badge>
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl">{activeSlide.title}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/72">{activeSlide.description}</p>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "scent-primary")}>Shop products</Link>
            </div>
            <div className="mt-7 flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.image}
                  className={cn("h-1.5 w-9 rounded-full transition-colors", index === slideIndex ? "bg-[#d7b15f]" : "bg-white/25")}
                  onClick={() => setSlideIndex(index)}
                  aria-label={`Show ${slide.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <section id="categories" className="space-y-10">
          {categories.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <Card key={index} className="scent-soft-panel h-72 animate-pulse" />)
          ) : categories.error ? (
            <Card className="p-6 text-sm text-destructive">Could not load categories.</Card>
          ) : (
            (categories.data ?? []).map((category) => {
              const categoryProducts = (category.products ?? []).slice(0, 10) as Product[]
              if (categoryProducts.length === 0) return null

              return (
                <div key={category.id} className="space-y-4 border-t border-[#d7b15f]/20 pt-8 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="scent-kicker mb-1 text-xs font-medium uppercase tracking-[0.18em]">Collection</p>
                      <h2 className="text-2xl font-semibold tracking-tight text-[#0b1b31]">{category.name}</h2>
                      {category.description && <p className="scent-text-muted mt-1 text-sm">{category.description}</p>}
                    </div>
                    <Link href={`/shop?categoryId=${category.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-[#9a742d] hover:bg-[#d7b15f]/10 hover:text-[#071323]")}>
                      See all
                    </Link>
                  </div>
                  <ProductCarousel
                    products={categoryProducts.map((product) => ({
                      ...product,
                      categoryId: category.id,
                      category: { id: category.id, name: category.name },
                    }))}
                    onAdd={addProduct}
                  />
                </div>
              )
            })
          )}
        </section>
      </div>

      <StorefrontFooter />
    </main>
  )
}
