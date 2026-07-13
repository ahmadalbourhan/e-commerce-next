// Typed fetch client for the EcommerceAPI backend.
// Handles JWT bearer auth, transparent token refresh, and ResponseDto unwrapping.

import type { AuthUser, RefreshTokenResponse, ResponseDto } from "./types"

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://localhost:7108"

export function getApiAssetUrl(path?: string | null): string {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

const ACCESS_TOKEN_KEY = "ecom_access_token"
const REFRESH_TOKEN_KEY = "ecom_refresh_token"

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=")
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    )
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function claimArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string")
  return typeof value === "string" ? [value] : []
}

export function isAccessTokenExpired(token: string | null): boolean {
  if (!token) return true

  const payload = decodeJwtPayload(token)
  const exp = Number(payload?.exp ?? 0)
  if (!exp) return true

  return exp * 1000 <= Date.now()
}

export function getAccessTokenExpiration(token: string | null): number | null {
  if (!token) return null

  const payload = decodeJwtPayload(token)
  const exp = Number(payload?.exp ?? 0)
  return exp ? exp * 1000 : null
}

export function getUserFromAccessToken(token: string | null): AuthUser | null {
  if (!token || typeof window === "undefined") return null
  if (isAccessTokenExpired(token)) return null

  const payload = decodeJwtPayload(token)
  if (!payload) return null

  const id = Number(payload.id ?? payload.nameid ?? payload.sub ?? 0)
  const email = String(payload.email ?? "")
  const phoneNumber = String(payload.phoneNumber ?? "")
  const fullName = String(payload.name ?? email)
  const role = claimArray(payload.role)[0] ?? "User"
  const permissions = claimArray(payload.permission)

  return {
    id,
    email,
    phoneNumber,
    fullName,
    role,
    permissions,
  }
}

export const tokenStore = {
  getAccess: () => (typeof window === "undefined" ? null : localStorage.getItem(ACCESS_TOKEN_KEY)),
  getRefresh: () => (typeof window === "undefined" ? null : localStorage.getItem(REFRESH_TOKEN_KEY)),
  getUser: () => getUserFromAccessToken(tokenStore.getAccess()),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  // when true, do not attempt to attach a token or refresh (used for auth endpoints)
  anonymous?: boolean
  // internal flag to prevent infinite refresh loops
  _retry?: boolean
}

let refreshPromise: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh()
  if (!refreshToken) return false

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/Auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return false
        const data = (await res.json()) as RefreshTokenResponse
        if (!data?.accessToken) return false
        tokenStore.setTokens(data.accessToken, data.refreshToken)
        return true
      } catch {
        return false
      } finally {
        // reset after settle so subsequent failures can retry
        setTimeout(() => {
          refreshPromise = null
        }, 0)
      }
    })()
  }
  return refreshPromise
}

async function rawRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, anonymous = false } = opts
  const headers: Record<string, string> = {}
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json"

  if (!anonymous) {
    const token = tokenStore.getAccess()
    if (token) headers["Authorization"] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
    })
  } catch (e) {
    throw new ApiError(
      `Network error reaching the API at ${API_BASE_URL}. Make sure the backend is running and reachable.`,
      0,
    )
  }

  // attempt one transparent refresh on 401
  if (res.status === 401 && !anonymous && !opts._retry) {
    const refreshed = await refreshSession()
    if (refreshed) {
      return rawRequest<T>(path, { ...opts, _retry: true })
    }
    tokenStore.clear()
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login"
    }
    throw new ApiError("Session expired. Please sign in again.", 401)
  }

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  let parsed: unknown = undefined
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "message" in parsed && (parsed as { message?: string }).message) ||
      (parsed && typeof parsed === "object" && "Message" in parsed && (parsed as { Message?: string }).Message) ||
      (typeof parsed === "string" && parsed) ||
      `Request failed with status ${res.status}`
    throw new ApiError(String(message), res.status)
  }

  return parsed as T
}

// Unwraps a ResponseDto<T> envelope, returning the inner data.
function unwrap<T>(value: ResponseDto<T> | T): T {
  if (value && typeof value === "object" && "data" in (value as object)) {
    return (value as ResponseDto<T>).data as T
  }
  return value as T
}

export const api = {
  // raw access for envelopes / messages
  request: rawRequest,

  // GET that unwraps ResponseDto
  async getWrapped<T>(path: string): Promise<T> {
    const res = await rawRequest<ResponseDto<T> | T>(path)
    return unwrap<T>(res)
  },
  async sendWrapped<T>(path: string, method: string, body?: unknown, opts: Pick<RequestOptions, "anonymous"> = {}): Promise<T> {
    const res = await rawRequest<ResponseDto<T> | T>(path, { method, body, ...opts })
    return unwrap<T>(res)
  },
  async uploadWrapped<T>(path: string, body: FormData): Promise<T> {
    const res = await rawRequest<ResponseDto<T> | T>(path, { method: "POST", body })
    return unwrap<T>(res)
  },

  // GET that returns raw entity
  get: <T>(path: string) => rawRequest<T>(path),
  post: <T>(path: string, body?: unknown, anonymous = false) =>
    rawRequest<T>(path, { method: "POST", body, anonymous }),
  put: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: "PATCH", body }),
  del: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: "DELETE", body }),
  upload: <T>(path: string, body: FormData) => rawRequest<T>(path, { method: "POST", body }),
}

// SWR fetcher helpers
export const swrFetcher = <T>(path: string) => api.get<T>(path)
export const swrWrappedFetcher = <T>(path: string) => api.getWrapped<T>(path)
