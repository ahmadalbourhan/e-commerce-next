"use client"

import useSWR from "swr"
import { swrWrappedFetcher } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { Order } from "@/lib/types"

export function useHasOrders() {
  const { user } = useAuth()
  const { data } = useSWR<Order[]>(user ? "/api/user/orders" : null, swrWrappedFetcher)

  return Boolean(data && data.length > 0)
}
