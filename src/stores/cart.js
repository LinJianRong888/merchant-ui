import { defineStore } from 'pinia'
import {
  getCartItems,
  addToCart as apiAddToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  getCartTotalCount
} from '@/api/cart'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    totalCount: 0,
    isInitialized: false
  }),

  getters: {
    cartItems: (state) => state.items,
    cartTotalCount: (state) => state.totalCount,
    cartTotalAmount: (state) => {
      return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    },
    hasItems: (state) => state.items.length > 0
  },

  actions: {
    async hydrate() {
      try {
        const items = await getCartItems()
        const totalCount = await getCartTotalCount()
        this.items = items
        this.totalCount = totalCount
        this.isInitialized = true
      } catch (error) {
        console.error('[cart-store] hydrate error', error)
        this.items = []
        this.totalCount = 0
        this.isInitialized = true
      }
    },

    async addToCart(product, quantity = 1) {
      try {
        const result = await apiAddToCart(product, quantity)
        this.items = result.cartItems
        this.totalCount = result.totalItems
        return result
      } catch (error) {
        console.error('[cart-store] addToCart error', error)
        throw error
      }
    },

    async updateQuantity(productId, quantity) {
      try {
        const result = await updateCartItemQuantity(productId, quantity)
        this.items = result.cartItems
        this.totalCount = result.totalItems
        return result
      } catch (error) {
        console.error('[cart-store] updateQuantity error', error)
        throw error
      }
    },

    async removeItem(productId) {
      try {
        const result = await removeFromCart(productId)
        this.items = result.cartItems
        this.totalCount = result.totalItems
        return result
      } catch (error) {
        console.error('[cart-store] removeItem error', error)
        throw error
      }
    },

    async clear() {
      try {
        const result = await clearCart()
        this.items = result.cartItems
        this.totalCount = result.totalItems
        return result
      } catch (error) {
        console.error('[cart-store] clear error', error)
        throw error
      }
    }
  }
})
