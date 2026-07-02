"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { User, Role } from "@/lib/types"
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

const NO_ROLE = "__none__"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  roles: Role[]
  onSaved: () => void
}

export function UserDialog({ open, onOpenChange, user, roles, onSaved }: UserDialogProps) {
  const isEdit = Boolean(user)
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [roleId, setRoleId] = useState<string>(NO_ROLE)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail(user?.email ?? "")
      setPhoneNumber(user?.phoneNumber ?? "")
      setFullName(user?.fullName ?? "")
      setPassword("")
      setRoleId(user?.roleId != null ? String(user.roleId) : NO_ROLE)
    }
  }, [open, user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const trimmedEmail = email.trim()
      const trimmedPhoneNumber = phoneNumber.trim()
      const displayName = fullName.trim() || trimmedEmail
      const payload: User = {
        id: user?.id ?? 0,
        name: displayName,
        email: trimmedEmail,
        phoneNumber: trimmedPhoneNumber,
        fullName: displayName,
        username: trimmedEmail,
        roleId: roleId === NO_ROLE ? null : Number(roleId),
        isActive: user?.isActive ?? true,
      }
      if (password.trim()) payload.password = password

      if (isEdit && user) {
        await api.put(`/api/Users/${user.id}`, { ...user, ...payload })
        toast.success("User updated")
      } else {
        await api.post("/api/Users", payload)
        toast.success("User created")
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the user's details." : "Add a new user account."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="u-name">Full name</Label>
              <Input id="u-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-phone">Phone number</Label>
              <Input
                id="u-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-password">{isEdit ? "New password" : "Password"}</Label>
              <Input
                id="u-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Leave blank to keep current" : ""}
                required={!isEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-role">Role</Label>
              <Select value={roleId} onValueChange={(value) => setRoleId(value ?? NO_ROLE)}>
                <SelectTrigger id="u-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ROLE}>No role</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
