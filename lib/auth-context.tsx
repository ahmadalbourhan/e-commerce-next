"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { api, getUserFromAccessToken, refreshSession, tokenStore } from "./api"
import type { AuthUser, LoginResponse } from "./types"

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (slug: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      const stored = tokenStore.getUser()
      if (stored) {
        if (!cancelled) setUser(stored as AuthUser)
        if (!cancelled) setLoading(false)
        return
      }

      const refreshed = await refreshSession()
      const refreshedUser = refreshed ? tokenStore.getUser() : null

      if (!cancelled) {
        if (refreshedUser) {
          setUser(refreshedUser as AuthUser)
        } else {
          tokenStore.clear()
          setUser(null)
        }
        setLoading(false)
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>("/api/Auth/login", { email, password }, true)
    if (!res?.accessToken) {
      throw new Error("Invalid response from server.")
    }
    tokenStore.set(res.accessToken, res.refreshToken)
    const tokenUser = getUserFromAccessToken(res.accessToken)
    if (!tokenUser) {
      tokenStore.clear()
      throw new Error("Invalid token received from server.")
    }
    setUser(tokenUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post("/api/Auth/logout")
    } catch {
      // ignore network/permission errors during logout
    }
    tokenStore.clear()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!tokenStore.getRefresh()) return

    const refreshed = await refreshSession()
    const refreshedUser = refreshed ? tokenStore.getUser() : null
    if (refreshedUser) {
      setUser(refreshedUser as AuthUser)
    }
  }, [])

  useEffect(() => {
    if (!user) return

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshUser()
      }
    }

    window.addEventListener("focus", refreshWhenVisible)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    const interval = window.setInterval(() => void refreshUser(), 60_000)

    return () => {
      window.removeEventListener("focus", refreshWhenVisible)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      window.clearInterval(interval)
    }
  }, [refreshUser, user])

  const hasPermission = useCallback(
    (slug: string) => {
      if (!user) return false
      return user.permissions?.includes(slug) ?? false
    },
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, hasPermission }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
