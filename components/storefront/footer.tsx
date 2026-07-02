"use client"

import Link from "next/link"
import { Package, ShoppingBag } from "lucide-react"

export function StorefrontFooter() {
  return (
    <footer className="border-t border-[#d7b15f]/20 bg-[#071323] text-[#f7e7bd]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="scent-brand-mark flex size-9 items-center justify-center rounded-md">
              <Package className="size-5" />
            </span>
            Scent
          </Link>
          <p className="mt-4 text-sm leading-6 text-[#f7e7bd]/70">
            Curated perfumes for everyday presence, evening rituals, and memorable gifts.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#d7b15f]">Shop</h2>
          <div className="mt-4 grid gap-2 text-sm text-[#f7e7bd]/72">
            <Link href="/shop" className="w-fit hover:text-[#d7b15f]">All products</Link>
            <Link href="/orders" className="w-fit hover:text-[#d7b15f]">Track orders</Link>
            <Link href="/checkout" className="w-fit hover:text-[#d7b15f]">Cart</Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#d7b15f]">Service</h2>
          <div className="mt-4 grid gap-2 text-sm text-[#f7e7bd]/72">
            <span>Cash on delivery</span>
            <span>Fresh stock updates</span>
            <span>Secure account checkout</span>
          </div>
        </div>
      </div>
      <div className="border-t border-[#d7b15f]/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-[#f7e7bd]/58 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Scent. All rights reserved.</span>
          <span className="inline-flex items-center gap-2">
            <ShoppingBag className="size-3.5" />
            Perfume selected with care
          </span>
        </div>
      </div>
    </footer>
  )
}
