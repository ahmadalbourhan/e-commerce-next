"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { api, getApiAssetUrl, swrWrappedFetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import type { PagedResult, Product, ProductReview, ProductReviewEligibility, ProductReviewStats } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StorefrontFooter } from "@/components/storefront/footer"
import { StorefrontHeader } from "@/components/storefront/header"
import { ChevronLeft, Minus, Package, Plus, ShoppingBag } from "lucide-react"
import { toast } from "sonner"

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function stars(rating: number) {
  return "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, Math.max(0, 5 - rating))
}

function formatDate(value?: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function validateReviewComment(comment: string) {
  const value = comment.trim().toLowerCase()
  if (!value) return null

  const blockedPatterns = [
    "<script",
    "</script",
    "javascript:",
    "onerror=",
    "onload=",
    "onclick=",
    "--",
    ";--",
    "/*",
    "*/",
    "xp_",
    "drop table",
    "drop database",
    "delete from",
    "insert into",
    "update ",
    "select ",
    "union select",
    "alter table",
    "truncate table",
    "exec ",
    "execute ",
  ]

  return blockedPatterns.some((pattern) => value.includes(pattern))
    ? "Comment cannot contain JavaScript or SQL commands."
    : null
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string | string[] }>()
  const router = useRouter()
  const { user } = useAuth()
  const cart = useCart()
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewOrderId, setReviewOrderId] = useState("")
  const [reviewRating, setReviewRating] = useState("5")
  const [reviewComment, setReviewComment] = useState("")
  const [reviewImageFile, setReviewImageFile] = useState<File | null>(null)
  const [reviewImagePreview, setReviewImagePreview] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const rawId = params.id
  const productId = Array.isArray(rawId) ? rawId[0] : rawId
  const { data: product, error, isLoading } = useSWR<Product>(
    productId ? `/api/user/products/${productId}` : null,
    swrWrappedFetcher,
  )
  const reviewPath = productId ? `/api/user/products/${productId}/reviews?page=${reviewPage}&pageSize=5` : null
  const reviews = useSWR<PagedResult<ProductReview>>(reviewPath, swrWrappedFetcher)
  const stats = useSWR<ProductReviewStats>(productId ? `/api/user/products/${productId}/reviews/stats` : null, swrWrappedFetcher)
  const eligibility = useSWR<ProductReviewEligibility>(
    user && productId ? `/api/user/products/${productId}/reviews/eligibility` : null,
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
  const reviewResult = reviews.data
  const reviewStats = stats.data

  async function submitReview(event: FormEvent) {
    event.preventDefault()
    if (!productId || !reviewOrderId) {
      toast.error("Choose the delivered order for this review.")
      return
    }

    const commentError = validateReviewComment(reviewComment)
    if (commentError) {
      toast.error(commentError)
      return
    }

    setSubmittingReview(true)
    try {
      let imageUrl: string | null = null
      if (reviewImageFile) {
        const formData = new FormData()
        formData.append("file", reviewImageFile)
        const uploaded = await api.uploadWrapped<{ imageUrl: string }>(
          `/api/user/products/${productId}/reviews/upload-image`,
          formData,
        )
        imageUrl = uploaded.imageUrl
      }

      await api.post(`/api/user/products/${productId}/reviews`, {
        orderId: Number(reviewOrderId),
        rating: Number(reviewRating),
        comment: reviewComment.trim() || null,
        imageUrl,
      })
      toast.success("Review added")
      setReviewOrderId("")
      setReviewRating("5")
      setReviewComment("")
      setReviewImageFile(null)
      setReviewImagePreview("")
      await Promise.all([reviews.mutate(), stats.mutate(), eligibility.mutate()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add review")
    } finally {
      setSubmittingReview(false)
    }
  }

  function handleReviewImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setReviewImageFile(null)
      setReviewImagePreview("")
      return
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, and GIF images are allowed.")
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be 5 MB or less.")
      event.target.value = ""
      return
    }

    setReviewImageFile(file)
    setReviewImagePreview(URL.createObjectURL(file))
  }

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
      <StorefrontHeader active="shop" signInNext="/checkout" />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link href="/shop" className="scent-text-muted mb-5 inline-flex items-center gap-2 text-sm font-medium hover:text-[#0b1b31]">
          <ChevronLeft className="size-4" />
          Back to products
        </Link>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(22rem,0.85fr)]">
            <Card className="scent-soft-panel h-[22rem] animate-pulse" />
            <Card className="scent-panel h-[28rem] animate-pulse" />
          </div>
        ) : error || !product ? (
          <Card className="scent-panel p-10 text-center">
            <p className="font-medium">Product not found</p>
            <p className="scent-text-muted mt-1 text-sm">The product may have been removed or is unavailable.</p>
          </Card>
        ) : (
                   <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(22rem,0.85fr)] lg:items-start">
            <section className="scent-media overflow-hidden rounded-lg border border-[#d7b15f]/25">
              <div className="flex  min-h-[20rem] items-center justify-center sm:h-[20rem] lg:h-[30rem]">
                {product.image || product.imageUrl ? (
                  <img
                    src={getApiAssetUrl(product.image || product.imageUrl)}
                    alt={product.name}
                    className="h-full max-h-[34rem] w-full object-cover"
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

              {reviewStats && reviewStats.totalReviews > 0 && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="text-[#d7b15f]">{stars(Math.round(reviewStats.averageRating))}</span>
                  <span className="font-medium">{reviewStats.averageRating.toFixed(1)}</span>
                  <span className="scent-text-muted">({reviewStats.totalReviews} reviews)</span>
                </div>
              )}

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

        {!isLoading && product && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Card className="scent-panel p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Reviews</h2>
                  <p className="scent-text-muted mt-1 text-sm">
                    {reviewStats?.totalReviews ? `${reviewStats.totalReviews} customer reviews` : "No reviews yet."}
                  </p>
                </div>
                {reviewStats && reviewStats.totalReviews > 0 && (
                  <div className="text-right">
                    <div className="text-[#d7b15f]">{stars(Math.round(reviewStats.averageRating))}</div>
                    <div className="text-sm font-medium">{reviewStats.averageRating.toFixed(1)} average</div>
                  </div>
                )}
              </div>

              <Separator className="my-5" />

              {reviews.isLoading ? (
                <p className="scent-text-muted text-sm">Loading reviews...</p>
              ) : !reviewResult || reviewResult.items.length === 0 ? (
                <p className="scent-text-muted text-sm">Be the first eligible customer to review this product.</p>
              ) : (
                <div className="space-y-5">
                  {reviewResult.items.map((review) => (
                    <article key={review.id} className="border-b border-[#d7b15f]/20 pb-5 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{review.user?.username || "Customer"}</p>
                          <p className="scent-text-muted text-xs">{formatDate(review.createdAt)}</p>
                        </div>
                        <div className="text-[#d7b15f]">{stars(review.rating)}</div>
                      </div>
                      {review.comment && <p className="mt-3 text-sm leading-6 text-[#53647c]">{review.comment}</p>}
                      {review.imageUrl && (
                        <img
                          src={getApiAssetUrl(review.imageUrl)}
                          alt="Review image"
                          className="mt-3 h-32 w-32 rounded-md object-cover"
                        />
                      )}
                    </article>
                  ))}
                  {reviewResult.totalPages > 1 && (
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <Button variant="outline" className="scent-outline" disabled={reviewPage <= 1} onClick={() => setReviewPage((page) => Math.max(1, page - 1))}>
                        Previous
                      </Button>
                      <span className="scent-text-muted text-sm">Page {reviewResult.page} of {reviewResult.totalPages}</span>
                      <Button variant="outline" className="scent-outline" disabled={reviewPage >= reviewResult.totalPages} onClick={() => setReviewPage((page) => page + 1)}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="scent-panel p-6">
              <h2 className="text-lg font-semibold tracking-tight">Write a review</h2>
              {!user ? (
                <p className="scent-text-muted mt-3 text-sm">Sign in after receiving your order to review this product.</p>
              ) : eligibility.isLoading ? (
                <p className="scent-text-muted mt-3 text-sm">Checking review eligibility...</p>
              ) : !eligibility.data?.canReview ? (
                <p className="scent-text-muted mt-3 text-sm">{eligibility.data?.message ?? "You can review this product after delivery."}</p>
              ) : (
                <form onSubmit={submitReview} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="review-order" className="text-sm font-medium">Delivered order</label>
                    <select
                      id="review-order"
                      value={reviewOrderId}
                      onChange={(event) => setReviewOrderId(event.target.value)}
                      required
                      className="scent-input h-10 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="">Select an order</option>
                      {eligibility.data.orders.map((order) => (
                        <option key={order.orderId} value={order.orderId}>
                          {order.orderNumber} {order.deliveredAt ? `- delivered ${formatDate(order.deliveredAt)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="review-rating" className="text-sm font-medium">Rating</label>
                    <select
                      id="review-rating"
                      value={reviewRating}
                      onChange={(event) => setReviewRating(event.target.value)}
                      className="scent-input h-10 w-full rounded-md border px-3 text-sm"
                    >
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>{rating} stars</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="review-comment" className="text-sm font-medium">Comment</label>
                    <textarea
                      id="review-comment"
                      value={reviewComment}
                      onChange={(event) => {
                        const value = event.target.value
                        setReviewComment(value)
                        const commentError = validateReviewComment(value)
                        if (commentError) toast.error(commentError)
                      }}
                      maxLength={1000}
                      placeholder="Optional"
                      className="scent-input min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="review-image" className="text-sm font-medium">Image</label>
                    <div className="flex items-center gap-3">
                      <input
                        id="review-image"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleReviewImageChange}
                        className="sr-only"
                      />
                      <label
                        htmlFor="review-image"
                        className="flex size-12 cursor-pointer items-center justify-center rounded-md border border-[#d7b15f]/35 bg-[#fffaf0] text-[#9a742d] transition-colors hover:bg-[#f1dfbd]"
                        aria-label="Choose review image"
                      >
                        <Plus className="size-5" />
                      </label>
                      {reviewImagePreview && (
                        <img
                          src={reviewImagePreview}
                          alt="Review image preview"
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="scent-primary w-full" disabled={submittingReview}>
                    {submittingReview ? "Saving..." : "Submit review"}
                  </Button>
                </form>
              )}
            </Card>
          </section>
        )}
      </div>
      <StorefrontFooter />
    </main>
  )
}
