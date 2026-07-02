// Shared types mirroring the EcommerceAPI backend.
// Some entities are returned raw; others are wrapped in ResponseDto<T>.

export interface ResponseDto<T> {
  status?: number
  message?: string
  data?: T
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface AuthUser {
  id: number
  email: string
  fullName: string
  phoneNumber?: string
  role: string
  permissions: string[]
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  phoneNumber: string
  password: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface Product {
  id: number
  name: string
  cost?: number
  description?: string | null
  price: number
  stock?: number | null
  image?: string | null
  imageUrl?: string | null
  categoryId?: number | null
  userId?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  category?: {
    id: number
    name: string
  } | null
  user?: {
    id: number
    username: string
    phoneNumber?: string | null
  } | null
}

export interface ProductReview {
  id: number
  productId: number
  userId: number
  orderId: number
  rating: number
  comment?: string | null
  imageUrl?: string | null
  createdAt: string
  user?: {
    id: number
    username: string
    phoneNumber?: string | null
  } | null
}

export interface ProductReviewStats {
  productId: number
  totalReviews: number
  averageRating: number
  ratingCounts: Record<number, number>
}

export interface ProductReviewEligibility {
  canReview: boolean
  message?: string | null
  orders: {
    orderId: number
    orderNumber: string
    orderedAt: string
    deliveredAt?: string | null
  }[]
}

export interface CategoryWithProducts {
  id: number
  name: string
  description?: string | null
  products?: Product[]
}

export interface CreateCategoryDto {
  name: string
  description?: string | null
}

export interface UpdateCategoryDto {
  id: number
  name: string
  description?: string | null
}

export interface User {
  id: number
  name?: string | null
  email: string
  phoneNumber?: string | null
  fullName?: string | null
  username?: string | null
  isActive?: boolean
  roleId?: number | null
  roleName?: string | null
  roles?: string[]
  permissions?: string[]
  password?: string | null
}

export interface Role {
  id: number
  name: string
  description?: string | null
}

export interface Permission {
  id: number
  name: string
  slug?: string | null
  description?: string | null
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt?: string | null
  updatedAt?: string | null
}

export interface Order {
  id: number
  orderNumber: string
  userId: number
  user?: {
    id: number
    username: string
    phoneNumber?: string | null
  } | null
  status: string
  total: number
  orderedAt: string
  acceptedAt?: string | null
  deliveredAt?: string | null
  paymentMethod: string
  items: OrderItem[]
}

export interface CartTotalItem {
  productId: number
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface CartTotals {
  subtotal: number
  items: CartTotalItem[]
}
