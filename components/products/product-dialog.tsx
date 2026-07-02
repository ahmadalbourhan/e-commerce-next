"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ApiError, api, getApiAssetUrl } from "@/lib/api"
import type { Product, CategoryWithProducts } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const NO_CATEGORY = "__none__"

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: CategoryWithProducts[]
  onSaved: () => void
}

export function ProductDialog({ open, onOpenChange, product, categories, onSaved }: ProductDialogProps) {
  const isEdit = Boolean(product)
  const [name, setName] = useState("")
  const [cost, setCost] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [image, setImage] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "")
      setCost(product?.cost != null ? String(product.cost) : "")
      setPrice(product?.price != null ? String(product.price) : "")
      setStock(product?.stock != null ? String(product.stock) : "0")
      setImage(product?.image ?? product?.imageUrl ?? "")
      setImageFile(null)
      setCategoryId(product?.categoryId != null ? String(product.categoryId) : NO_CATEGORY)
    }
  }, [open, product])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("")
      return
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (categoryId === NO_CATEGORY) {
      toast.error("Please choose a category before saving the product.")
      return
    }
    if (Number(price) < Number(cost)) {
      toast.error("Price cannot be less than cost.")
      return
    }

    setSaving(true)
    try {
      let imagePath = image
      if (imageFile) {
        const formData = new FormData()
        formData.append("file", imageFile)
        const uploaded = await api.uploadWrapped<{ imagePath: string }>("/Product/upload-image", formData)
        imagePath = uploaded.imagePath
      }

      const payload = {
        id: product?.id ?? 0,
        name: name.trim(),
        cost: Number(cost) || 0,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        image: imagePath.trim() || "",
        categoryId: Number(categoryId),
      }
      if (isEdit && product) {
        await api.put(`/Product/${product.id}`, payload)
        toast.success("Product updated")
      } else {
        await api.post("/Product", payload)
        toast.success("Product created")
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        toast.error(err.message || "Could not save the product. Check the details, then try again.")
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to save product")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the product details below." : "Add a new product to your catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                step="1"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? NO_CATEGORY)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category">
                    {(value) =>
                      value === NO_CATEGORY
                        ? "Select a category"
                        : categories.find((category) => String(category.id) === String(value))?.name ?? "Select a category"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} label={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Product photo</Label>
              <Input
                id="image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              {(imagePreview || image) && (
                <div className="overflow-hidden rounded-md border bg-muted/30">
                  <img
                    src={imagePreview || getApiAssetUrl(image)}
                    alt={name || "Product photo"}
                    className="h-32 w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
