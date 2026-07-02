"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { Role } from "@/lib/types"
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

export function RoleDialog({
  open,
  onOpenChange,
  role,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role | null
  onSaved: () => void
}) {
  const isEdit = Boolean(role)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "")
      setDescription(role?.description ?? "")
    }
  }, [open, role])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit && role) {
        await api.put(`/api/Roles/${role.id}`, {
          ...role,
          name: name.trim(),
          description: description.trim() || null,
        })
        toast.success("Role updated")
      } else {
        await api.post("/api/Roles", { name: name.trim(), description: description.trim() || null })
        toast.success("Role created")
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save role")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit role" : "New role"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the role details." : "Define a new role."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="r-name">Name</Label>
              <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="r-desc">Description</Label>
              <Input
                id="r-desc"
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
              {isEdit ? "Save changes" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
