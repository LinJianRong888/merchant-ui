<template>
  <view class="cart-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <view class="search-icon"></view>
        <input
          class="search-input"
          placeholder="请输入商品搜索"
          placeholder-class="search-placeholder"
          @tap="handleSearchTap"
        />
      </view>
      <view class="nav-clear" @tap="handleClearCart">
        <text class="nav-clear-text">清空</text>
      </view>
    </view>

    <!-- 未登录提示 -->
    <view v-if="!authStore.isAuthenticated" class="login-notice" @tap="handleLoginPrompt">
      <text class="login-notice-text">您还未登录，登录后方可使用更多功能</text>
      <text class="login-notice-arrow">›</text>
    </view>

    <template v-if="authStore.isAuthenticated">
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
        <view class="checkbox" @tap="toggleSelectItem(item.id)">
          <view v-if="selectedItemIds.includes(item.id)" class="checkbox-inner checked"></view>
          <view v-else class="checkbox-inner"></view>
        </view>
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
      <view class="checkbox" @tap="toggleSelectAll">
        <view :class="['checkbox-inner', { checked: isAllSelected }]"></view>
        <text class="select-all-text">全选</text>
      </view>
      <view class="total-info">
        <text class="total-label">合计：</text>
        <text class="total-price">¥{{ formatPrice(selectedTotalAmount) }}</text>
      </view>
      <button class="checkout-btn" :disabled="!hasSelectedItems" :loading="isCheckoutLoading" @tap="handleCheckout">
        结算 ({{ selectedTotalCount }})
      </button>
    </view>
    </template>
  </view>
</template>

<script>
import { computed, ref, watch } from 'vue'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'

import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'

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
    const authStore = useAuthStore()
    const isLoading = ref(true)
    const isCheckoutLoading = ref(false)
    const selectedItemIds = ref([])

    const cartItems = computed(() => cartStore.cartItems)
    const cartTotalCount = computed(() => cartStore.cartTotalCount)
    const cartTotalAmount = computed(() => cartStore.cartTotalAmount)
    const hasItems = computed(() => cartStore.hasItems)

    const selectedItems = computed(() => {
      return cartItems.value.filter(item => selectedItemIds.value.includes(item.id))
    })

    const selectedTotalCount = computed(() => {
      return selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
    })

    const selectedTotalAmount = computed(() => {
      return selectedItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    })

    const hasSelectedItems = computed(() => selectedItems.value.length > 0)

    const isAllSelected = computed(() => {
      return cartItems.value.length > 0 && selectedItemIds.value.length === cartItems.value.length
    })

    watch(cartItems, (newItems) => {
      const existingIds = newItems.map(item => item.id)
      selectedItemIds.value = selectedItemIds.value.filter(id => existingIds.includes(id))
    }, { deep: true })

    function toggleSelectItem(itemId) {
      const index = selectedItemIds.value.indexOf(itemId)
      if (index > -1) {
        selectedItemIds.value.splice(index, 1)
      } else {
        selectedItemIds.value.push(itemId)
      }
    }

    function toggleSelectAll() {
      if (isAllSelected.value) {
        selectedItemIds.value = []
      } else {
        selectedItemIds.value = cartItems.value.map(item => item.id)
      }
    }

    function goHome() {
      Taro.switchTab({
        url: '/pages/products/index'
      })
    }

    function handleLoginPrompt () {
      Taro.showModal({
        title: '提示',
        content: '请先登录后再使用此功能',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            Taro.navigateTo({ url: '/pages/index/index' })
          }
        }
      })
    }

    function handleSearchTap () {
      Taro.switchTab({ url: '/pages/products/index' })
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
            const index = selectedItemIds.value.indexOf(itemId)
            if (index > -1) {
              selectedItemIds.value.splice(index, 1)
            }
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
            selectedItemIds.value = []
            Taro.showToast({
              title: '已清空',
              icon: 'success'
            })
          }
        }
      })
    }

    function validateCheckout () {
      if (!authStore.isAuthenticated) {
        Taro.showToast({ title: '请先登录', icon: 'none' })
        return false
      }
      if (!hasSelectedItems.value) {
        Taro.showToast({ title: '请选择要结算的商品', icon: 'none' })
        return false
      }
      // 校验选中商品是否有效（价格、数量、库存）
      const invalidItems = selectedItems.value.filter(
        item => !item.price || item.price <= 0 || !item.quantity || item.quantity < 1
      )
      if (invalidItems.length > 0) {
        Taro.showToast({ title: '部分商品信息异常，请重新添加', icon: 'none' })
        return false
      }
      const outOfStock = selectedItems.value.filter(
        item => item.stock != null && item.stock <= 0
      )
      if (outOfStock.length > 0) {
        Taro.showToast({ title: '部分商品已售罄，请移除后重试', icon: 'none' })
        return false
      }
      return true
    }

    async function handleCheckout() {
      if (!validateCheckout()) return

      isCheckoutLoading.value = true

      try {
        await Taro.navigateTo({
          url: '/pages/orders/address-select/index?fromCart=true&selectedIds=' + encodeURIComponent(JSON.stringify(selectedItemIds.value))
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
      authStore,
      cartItems,
      cartTotalCount,
      cartTotalAmount,
      hasItems,
      isLoading,
      isCheckoutLoading,
      selectedItemIds,
      selectedTotalCount,
      selectedTotalAmount,
      hasSelectedItems,
      isAllSelected,
      goHome,
      handleLoginPrompt,
      handleSearchTap,
      formatPrice,
      handleDecreaseQuantity,
      handleIncreaseQuantity,
      handleDeleteItem,
      handleClearCart,
      handleCheckout,
      toggleSelectItem,
      toggleSelectAll
    }
  },

  onShareAppMessage () {
    return {
      title: '柑之怡商户端',
      path: '/pages/home/index'
    }
  }
}
</script>
