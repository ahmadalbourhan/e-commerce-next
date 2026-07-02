"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, ShoppingBag } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { user, login, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [nextPath, setNextPath] = useState("/")

  useEffect(() => {
    setNextPath(new URLSearchParams(window.location.search).get("next") || "/")
  }, [])

  useEffect(() => {
    if (!loading && user) router.replace(nextPath)
  }, [loading, user, router, nextPath])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      toast.success("Signed in successfully")
      router.replace(nextPath)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="scent-shell flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="scent-brand-mark flex size-11 items-center justify-center rounded-xl">
            <ShoppingBag className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-balance text-[#0b1b31]">Scent</h1>
          <p className="text-sm text-[#5f6878] text-pretty">Sign in to shop, track orders, or manage the store</p>
        </div>

        <Card className="scent-panel">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="scent-primary mt-1 w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Sign in
              </Button>
            </form>
            <p className="scent-text-muted mt-4 text-center text-sm">
              New to Scent?{" "}
              <button type="button" className="scent-price font-medium hover:underline" onClick={() => router.push(`/register?next=${encodeURIComponent(nextPath || "/checkout")}`)}>
                Create an account
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
