"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShoppingBag } from "lucide-react"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const { user, loading, login } = useAuth()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [nextPath, setNextPath] = useState("/checkout")

  useEffect(() => {
    setNextPath(new URLSearchParams(window.location.search).get("next") || "/checkout")
  }, [])

  useEffect(() => {
    if (!loading && user) router.replace(nextPath)
  }, [loading, user, router, nextPath])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await api.post("/api/Auth/register", { fullName, email, phoneNumber, password }, true)
      await login(email, password)
      toast.success("Account created")
      router.replace(nextPath)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="scent-shell flex min-h-svh items-center justify-center p-4">
      <Card className="scent-panel w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="scent-brand-mark mx-auto mb-2 flex size-11 items-center justify-center rounded-xl">
            <ShoppingBag className="size-6" />
          </div>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Register to checkout and track your orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <Button type="submit" className="scent-primary w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Create account
            </Button>
          </form>
          <Button variant="link" className="scent-price mt-3 w-full" onClick={() => router.push(`/login?next=${encodeURIComponent(nextPath)}`)}>
            Already have an account?
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
