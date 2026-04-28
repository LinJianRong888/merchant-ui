import Taro from '@tarojs/taro'
import { request, API_BASE_URL } from '@/utils/request'

const CART_STORAGE_KEY = 'cart_items'

export async function getCartItems() {
  const cartItems = Taro.getStorageSync(CART_STORAGE_KEY) || []
  return cartItems
}

export async function addToCart(product, quantity = 1) {
  const cartItems = await getCartItems()
  
  const existingItemIndex = cartItems.findIndex(item => item.id === product.id)
  
  if (existingItemIndex !== -1) {
    cartItems[existingItemIndex].quantity += quantity
  } else {
    cartItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      coverImage: product.coverImage || product.image || '',
      specification: product.specification || '-',
      quantity: quantity
    })
  }
  
  Taro.setStorageSync(CART_STORAGE_KEY, cartItems)
  
  console.log('[cart-api] addToCart', { product, quantity, totalItems: cartItems.length })
  
  return {
    success: true,
    cartItems,
    totalItems: cartItems.length
  }
}

export async function updateCartItemQuantity(productId, quantity) {
  const cartItems = await getCartItems()
  
  const itemIndex = cartItems.findIndex(item => item.id === productId)
  
  if (itemIndex !== -1) {
    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1)
    } else {
      cartItems[itemIndex].quantity = quantity
    }
    
    Taro.setStorageSync(CART_STORAGE_KEY, cartItems)
  }
  
  return {
    success: true,
    cartItems,
    totalItems: cartItems.length
  }
}

export async function removeFromCart(productId) {
  const cartItems = await getCartItems()
  const filteredItems = cartItems.filter(item => item.id !== productId)
  
  Taro.setStorageSync(CART_STORAGE_KEY, filteredItems)
  
  return {
    success: true,
    cartItems: filteredItems,
    totalItems: filteredItems.length
  }
}

export async function clearCart() {
  Taro.removeStorageSync(CART_STORAGE_KEY)
  
  return {
    success: true,
    cartItems: [],
    totalItems: 0
  }
}

export async function getCartTotalCount() {
  const cartItems = await getCartItems()
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  return totalCount
}
