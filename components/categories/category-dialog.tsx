"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { CategoryWithProducts } from "@/lib/types"
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
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryWithProducts | null
  onSaved: () => void
}

export function CategoryDialog({ open, onOpenChange, category, onSaved }: CategoryDialogProps) {
  const isEdit = Boolean(category)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionError, setDescriptionError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "")
      setDescription(category?.description ?? "")
      setDescriptionError("")
    }
  }, [open, category])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      const message = "Please enter a description for this category."
      setDescriptionError(message)
      toast.error(message)
      return
    }

    setSaving(true)
    try {
      if (isEdit && category) {
        await api.put(`/Category/${category.id}`, {
          id: category.id,
          name: name.trim(),
          description: trimmedDescription,
        })
        toast.success("Category updated")
      } else {
        await api.post("/Category", {
          name: name.trim(),
          description: trimmedDescription,
        })
        toast.success("Category created")
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save category")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the category details." : "Add a new category to organize products."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (descriptionError) setDescriptionError("")
                }}
                placeholder="Describe this category"
                required
                aria-invalid={Boolean(descriptionError)}
                aria-describedby={descriptionError ? "cat-desc-error" : undefined}
              />
              {descriptionError && (
                <p id="cat-desc-error" className="text-sm text-destructive">
                  {descriptionError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
