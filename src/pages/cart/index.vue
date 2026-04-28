<template>
  <view class="cart-page">
    <view class="nav-bar">
      <view class="nav-more" @tap="handleClearCart">
        <text class="nav-more-text">清空</text>
      </view>
    </view>

    <view v-if="isLoading" class="loading-view">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="!hasItems" class="empty-view">
      <view class="empty-icon">
        <text class="empty-icon-text">🛒</text>
      </view>
      <text class="empty-text">购物车是空的</text>
      <button class="empty-btn" @tap="goHome">去逛逛</button>
    </view>

    <view v-else class="cart-list">
      <view class="cart-item" v-for="(item, index) in cartItems" :key="item.id">
        <image class="item-image" :src="item.coverImage || ''" mode="aspectFill" />
        <view class="item-info">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-spec">{{ item.specification || '-' }}</text>
          <view class="item-bottom">
            <text class="item-price">¥{{ formatPrice(item.price) }}</text>
            <view class="quantity-box">
              <view class="qty-btn" @tap="handleDecreaseQuantity(item.id, item.quantity)">-</view>
              <text class="qty-num">{{ item.quantity }}</text>
              <view class="qty-btn" @tap="handleIncreaseQuantity(item.id, item.quantity)">+</view>
            </view>
          </view>
        </view>
        <view class="delete-btn" @tap="handleDeleteItem(item.id)">
          <text class="delete-icon">×</text>
        </view>
      </view>
    </view>

    <view v-if="hasItems" class="bottom-bar">
      <view class="total-info">
        <text class="total-label">合计：</text>
        <text class="total-price">¥{{ formatPrice(cartTotalAmount) }}</text>
      </view>
      <button class="checkout-btn" :loading="isCheckoutLoading" @tap="handleCheckout">
        结算 ({{ cartTotalCount }})
      </button>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'

import { useCartStore } from '@/stores/cart'

import './index.scss'

function formatPrice(price) {
  const value = Number(price)
  if (Number.isFinite(value)) {
    return value.toFixed(2)
  }
  return '0.00'
}

export default {
  setup() {
    const cartStore = useCartStore()
    const isLoading = ref(true)
    const isCheckoutLoading = ref(false)

    const cartItems = computed(() => cartStore.cartItems)
    const cartTotalCount = computed(() => cartStore.cartTotalCount)
    const cartTotalAmount = computed(() => cartStore.cartTotalAmount)
    const hasItems = computed(() => cartStore.hasItems)

    function goHome() {
      Taro.switchTab({
        url: '/pages/home/index'
      })
    }

    async function handleDecreaseQuantity(itemId, currentQuantity) {
      if (currentQuantity <= 1) {
        await handleDeleteItem(itemId)
      } else {
        await cartStore.updateQuantity(itemId, currentQuantity - 1)
      }
    }

    async function handleIncreaseQuantity(itemId, currentQuantity) {
      await cartStore.updateQuantity(itemId, currentQuantity + 1)
    }

    async function handleDeleteItem(itemId) {
      Taro.showModal({
        title: '提示',
        content: '确定删除该商品吗？',
        success: async (res) => {
          if (res.confirm) {
            await cartStore.removeItem(itemId)
            Taro.showToast({
              title: '已删除',
              icon: 'success'
            })
          }
        }
      })
    }

    async function handleClearCart() {
      if (!hasItems.value) return
      
      Taro.showModal({
        title: '提示',
        content: '确定清空购物车吗？',
        success: async (res) => {
          if (res.confirm) {
            await cartStore.clear()
            Taro.showToast({
              title: '已清空',
              icon: 'success'
            })
          }
        }
      })
    }

    async function handleCheckout() {
      if (!hasItems.value) return

      isCheckoutLoading.value = true

      try {
        await Taro.navigateTo({
          url: '/pages/orders/address-select/index?fromCart=true'
        })
      } catch (error) {
        console.error('[cart] checkout error', error)
      } finally {
        isCheckoutLoading.value = false
      }
    }

    useLoad(() => {
      cartStore.hydrate().finally(() => {
        isLoading.value = false
      })
    })

    usePullDownRefresh(async () => {
      try {
        await cartStore.hydrate()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      cartItems,
      cartTotalCount,
      cartTotalAmount,
      hasItems,
      isLoading,
      isCheckoutLoading,
      goHome,
      formatPrice,
      handleDecreaseQuantity,
      handleIncreaseQuantity,
      handleDeleteItem,
      handleClearCart,
      handleCheckout
    }
  }
}
</script>
