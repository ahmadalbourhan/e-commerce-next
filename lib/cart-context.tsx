"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api } from "./api"
import { useAuth } from "./auth-context"
import type { CartTotals, Product } from "./types"

export interface CartItem {
  product: Product
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  totalsLoading: boolean
  getItemTotal: (productId: number) => number
  addItem: (product: Product) => boolean
  updateQuantity: (productId: number, quantity: number) => void
  removeItem: (productId: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)
const GUEST_CART_KEY = "ecom_cart_guest"

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [activeCartKey, setActiveCartKey] = useState<string | null>(null)
  const [totals, setTotals] = useState<CartTotals>({ subtotal: 0, items: [] })
  const [totalsLoading, setTotalsLoading] = useState(false)
  const cartKey = user ? `ecom_cart_user_${user.id}` : GUEST_CART_KEY

  useEffect(() => {
    if (loaded && activeCartKey) {
      localStorage.setItem(activeCartKey, JSON.stringify(items))
    }

    try {
      const stored = localStorage.getItem(cartKey)
      if (stored) setItems(JSON.parse(stored) as CartItem[])
      else setItems([])
    } catch {
      setItems([])
    } finally {
      setActiveCartKey(cartKey)
      setLoaded(true)
    }
  }, [cartKey])

  useEffect(() => {
    if (loaded && activeCartKey) localStorage.setItem(activeCartKey, JSON.stringify(items))
  }, [activeCartKey, items, loaded])

  useEffect(() => {
    if (!loaded) return

    if (items.length === 0) {
      setTotals({ subtotal: 0, items: [] })
      setTotalsLoading(false)
      return
    }

    let cancelled = false
    setTotalsLoading(true)

    api
      .sendWrapped<CartTotals>(
        "/api/user/cart/calculate",
        "POST",
        { items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })) },
        { anonymous: true },
      )
      .then((nextTotals) => {
        if (!cancelled) setTotals(nextTotals)
      })
      .catch(() => {
        if (!cancelled) setTotals({ subtotal: 0, items: [] })
      })
      .finally(() => {
        if (!cancelled) setTotalsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [items, loaded])

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const lineTotals = new Map(totals.items.map((item) => [item.productId, Number(item.totalPrice)]))

    return {
      items,
      count,
      subtotal: Number(totals.subtotal ?? 0),
      totalsLoading,
      getItemTotal(productId) {
        return lineTotals.get(productId) ?? 0
      },
      addItem(product) {
        const stock = Number(product.stock ?? 0)
        if (stock <= 0) return false

        const existingItem = items.find((item) => item.product.id === product.id)
        if (existingItem && existingItem.quantity >= stock) return false

        setItems((current) => {
          const existing = current.find((item) => item.product.id === product.id)
          if (existing) {
            if (existing.quantity >= stock) return current
            return current.map((item) =>
              item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
            )
          }
          return [...current, { product, quantity: 1 }]
        })
        return true
      },
      updateQuantity(productId, quantity) {
        setItems((current) =>
          current.map((item) => {
            if (item.product.id !== productId) return item
            const stock = Number(item.product.stock ?? 0)
            return { ...item, quantity: Math.min(Math.max(1, quantity), Math.max(1, stock)) }
          }),
        )
      },
      removeItem(productId) {
        setItems((current) => current.filter((item) => item.product.id !== productId))
      },
      clear() {
        setItems([])
      },
    }
  }, [items, totals, totalsLoading])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}
