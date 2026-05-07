<template>
  <view class="product-detail-page">
    <EmptyStatePanel
      v-if="routeResolved && !hasProductId"
      badge-text="MISSING"
      title="没有拿到商品信息"
      description="当前页面缺少商品 id，无法加载详情。你可以返回上一页重新进入。"
      action-text="返回上一页"
      @action="handleGoBack"
    />

    <view v-else-if="isLoading" class="detail-skeleton">
      <view class="detail-skeleton__media"></view>
      <view class="detail-skeleton__line detail-skeleton__line--title"></view>
      <view class="detail-skeleton__line"></view>
      <view class="detail-skeleton__line short"></view>
    </view>

    <view v-else-if="isError" class="detail-state-panel">
      <text class="detail-state-panel__title">加载失败</text>
      <text class="detail-state-panel__desc">{{ errorMessage }}</text>
      <button class="detail-state-panel__button" :loading="isFetching" @tap="refetch">重试</button>

    </view>

    <view v-else-if="product" class="product-detail-shell">
      <swiper class="product-swiper" :indicator-dots="true" :autoplay="false">
        <swiper-item>
          <image v-if="product.coverImage" class="product-image" :src="product.coverImage" mode="aspectFill" />
          <view v-else class="product-image product-image--empty">
            <text class="product-image__text">{{ product.placeholderText }}</text>
          </view>
        </swiper-item>
      </swiper>

      <view class="product-info">
        <view class="product-price-row">
          <text class="product-price">{{ product.displayPrice }}</text>
          <text class="product-origin-price">¥{{ (product.price || 299) * 1.5 }}</text>
        </view>
        <view class="product-name-row">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-index">1/1</text>
        </view>
        <text class="product-tag"> </text>
      </view>

      <view class="product-specs">
        <text class="specs-title">商品详情</text>
        <view class="spec-item">
          <text class="spec-label">规格</text>
          <text class="spec-value">{{ product.specification || '-' }}</text>
        </view>
        <view class="spec-item">
          <text class="spec-label">包装</text>
          <text class="spec-value">{{ product.packaging || '-' }}</text>
        </view>
        <view class="spec-item">
          <text class="spec-label">保质期</text>
          <text class="spec-value">{{ product.shelf_life || '-' }}</text>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="bottom-left">
          <view class="bottom-btn" @tap="goHome">
            <image class="bottom-btn-icon" :src="homeIcon" mode="aspectFit" />
            <text class="bottom-btn-text">首页</text>
          </view>
          <view class="bottom-btn cart-btn" @tap="handleGoToCart">
            <image class="bottom-btn-icon" :src="cartIcon" mode="aspectFit" />
            <view class="cart-badge" v-if="cartTotalCount > 0">{{ cartTotalCount }}</view>
            <text class="bottom-btn-text">购物车</text>
          </view>
        </view>
        <view class="bottom-right">
          <button class="btn-add-cart" :loading="isAddingToCart" @tap="handleAddToCart">加入购物车</button>
          <button class="btn-buy-now" :loading="isSubmitting" @tap="handlePlaceOrder">立即购买</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { getCurrentInstance, useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useAppQuery } from '@/utils/app-query'

import EmptyStatePanel from '@/components/EmptyStatePanel.vue'
import { getSaleProductDetail } from '@/api/products'
import { useCartStore } from '@/stores/cart'
import homeIcon from '@/assets/home.png'
import cartIcon from '@/assets/cart.svg'

import './index.scss'

function formatPrice (price) {
  const value = Number(price)

  if (Number.isFinite(value)) {
    return `¥${value.toFixed(2)}`
  }

  return '¥--'
}

function formatStock (stock) {
  const value = Number(stock)

  if (Number.isFinite(value)) {
    return String(value)
  }

  return '--'
}

function normalizeProduct (item) {
  if (!item) {
    return null
  }

  return {
    ...item,
    coverImage: item.image || item.product_image || '',
    displayPrice: formatPrice(item.price),
    displayStock: formatStock(item.stock),
    placeholderText: (item.name || '商品').slice(0, 1).toUpperCase()
  }
}

function formatError (error) {
  const lines = [error?.message || '请稍后重试']

  if (error?.statusCode) {
    lines.push(`status: ${error.statusCode}`)
  }

  return lines.join('\n')
}

export default {
  components: {
    EmptyStatePanel
  },

  setup () {
    const cartStore = useCartStore()
    const productId = ref('')
    const quantity = ref(1)
    const isSubmitting = ref(false)
    const isAddingToCart = ref(false)
    const routeResolved = ref(false)

    const {
      data: product,
      isLoading,
      isFetching,
      isError,
      error,
      refetch
    } = useAppQuery({
      queryKey: computed(() => ['products', 'detail', productId.value]),
      queryFn: async () => normalizeProduct(await getSaleProductDetail(productId.value)),
      enabled: computed(() => Boolean(productId.value))
    })

    const errorMessage = computed(() => formatError(error.value))
    const hasProductId = computed(() => Boolean(productId.value))
    const orderAmountText = computed(() => {
      const unitPrice = Number(product.value?.price)

      if (!Number.isFinite(unitPrice)) {
        return '¥--'
      }

      return `¥${(unitPrice * quantity.value).toFixed(2)}`
    })

    const cartTotalCount = computed(() => cartStore.cartTotalCount)

    async function handleSelectAddress () {
      if (!product.value?.id || isSubmitting.value) {
        return
      }

      isSubmitting.value = true

      try {
        await Taro.navigateTo({
          url: `/pages/orders/address-select/index?productId=${product.value.id}&quantity=${quantity.value}`
        })
      } finally {
        isSubmitting.value = false
      }
    }

    function handlePlaceOrder () {
      void handleSelectAddress()
    }

    function handleGoToCart () {
      Taro.switchTab({
        url: '/pages/cart/index'
      })
    }

    async function handleAddToCart () {
      if (!product.value?.id || isAddingToCart.value) {
        return
      }

      isAddingToCart.value = true

      try {
        await cartStore.addToCart(product.value, quantity.value)
        Taro.showToast({
          title: '已加入购物车',
          icon: 'success',
          duration: 1500
        })
      } catch (error) {
        console.error('[detail] addToCart error', error)
        Taro.showToast({
          title: '添加失败',
          icon: 'none'
        })
      } finally {
        isAddingToCart.value = false
      }
    }

    function handleDecreaseQuantity () {
      quantity.value = Math.max(1, quantity.value - 1)
    }

    function handleIncreaseQuantity () {
      quantity.value = Math.min(99, quantity.value + 1)
    }

    function goHome () {
      Taro.switchTab({
        url: '/pages/home/index'
      })
    }

    function handleGoBack () {
      Taro.navigateBack({
        fail: () => {
          goHome()
        }
      })
    }

    useLoad((params) => {
      productId.value = params?.id || getCurrentInstance()?.router?.params?.id || ''
      routeResolved.value = true
      cartStore.hydrate()
    })

    usePullDownRefresh(async () => {
      try {
        await refetch()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      errorMessage,
      handleGoBack,
      handleDecreaseQuantity,
      handleIncreaseQuantity,
      handleGoToCart,
      handleAddToCart,
      handlePlaceOrder,
      hasProductId,
      isError,
      isFetching,
      isLoading,
      isSubmitting,
      isAddingToCart,
      refetch,
      orderAmountText,
      product,
      quantity,
      routeResolved,
      cartTotalCount,
      goHome,
      homeIcon,
      cartIcon
    }
  }
}
</script>
