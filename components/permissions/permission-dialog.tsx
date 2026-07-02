"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { Permission } from "@/lib/types"
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

export function PermissionDialog({
  open,
  onOpenChange,
  permission,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  permission?: Permission | null
  onSaved: () => void
}) {
  const isEdit = Boolean(permission)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(permission?.name ?? "")
      setSlug(permission?.slug ?? "")
      setDescription(permission?.description ?? "")
    }
  }, [open, permission])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || null,
        description: description.trim() || null,
      }
      if (isEdit && permission) {
        await api.put(`/api/Permissions/${permission.id}`, { ...permission, ...payload })
        toast.success("Permission updated")
      } else {
        await api.post("/api/Permissions", payload)
        toast.success("Permission created")
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save permission")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit permission" : "New permission"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the permission details." : "Define a new permission."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-slug">Slug</Label>
              <Input
                id="p-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. AdminManagement.Create"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-desc">Description</Label>
              <Input
                id="p-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create permission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
