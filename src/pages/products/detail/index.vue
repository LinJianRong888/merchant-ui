<template>
  <view class="product-detail-page">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">商品详情</text>
      <view class="nav-more">
        <text class="nav-more-icon">⋯</text>
      </view>
    </view>

    <view v-if="isLoading" class="detail-skeleton">
      <view class="detail-skeleton__media"></view>
      <view class="detail-skeleton__line detail-skeleton__line--title"></view>
      <view class="detail-skeleton__line"></view>
      <view class="detail-skeleton__line short"></view>
    </view>

    <view v-else-if="isError" class="detail-state-panel">
      <text class="detail-state-panel__title">加载失败</text>
      <text class="detail-state-panel__desc">{{ errorMessage }}</text>
      <button class="detail-state-panel__button" :loading="isFetching" @tap="loadProductDetail">重试</button>
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
        <text class="specs-title">图文详情</text>
        <view class="spec-item">
          <text class="spec-label">规格</text>
          <text class="spec-value">{{ product.specification || '249g/盒' }}</text>
        </view>
        <view class="spec-item">
          <text class="spec-label">产地</text>
          <text class="spec-value">{{ product.packaging || '广东省广州市（以实际商品批次为准）' }}</text>
        </view>
        <view class="spec-item">
          <text class="spec-label">产地</text>
          <text class="spec-value">{{ product.shelf_life || '0-4度' }}</text>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="bottom-left">
          <view class="bottom-btn" @tap="goHome">
            <text class="bottom-btn-icon">🏠</text>
            <text class="bottom-btn-text">首页</text>
          </view>
        </view>
        <view class="bottom-right">
          <button class="btn-buy-now" :loading="isSubmitting" @tap="handlePlaceOrder">立即购买</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { getCurrentInstance, useLoad, usePullDownRefresh } from '@tarojs/taro'

import { getSaleProductDetail } from '@/api/products'

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
  setup () {
    const productId = ref('')
    const product = ref(null)
    const quantity = ref(1)
    const isLoading = ref(true)
    const isFetching = ref(false)
    const isSubmitting = ref(false)
    const loadError = ref(null)

    const isError = computed(() => Boolean(loadError.value))
    const errorMessage = computed(() => formatError(loadError.value))
    const orderAmountText = computed(() => {
      const unitPrice = Number(product.value?.price)

      if (!Number.isFinite(unitPrice)) {
        return '¥--'
      }

      return `¥${(unitPrice * quantity.value).toFixed(2)}`
    })

    async function loadProductDetail () {
      if (!productId.value || isFetching.value) {
        return
      }

      isFetching.value = true
      loadError.value = null

      if (!product.value) {
        isLoading.value = true
      }

      try {
        const response = await getSaleProductDetail(productId.value)
        product.value = normalizeProduct(response)
      } catch (error) {
        loadError.value = error
      } finally {
        isFetching.value = false
        isLoading.value = false
      }
    }

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

    function handleDecreaseQuantity () {
      quantity.value = Math.max(1, quantity.value - 1)
    }

    function handleIncreaseQuantity () {
      quantity.value = Math.min(99, quantity.value + 1)
    }

    function goBack() {
      Taro.navigateBack()
    }

    function goHome() {
      Taro.switchTab({
        url: '/pages/home/index'
      })
    }

    useLoad((params) => {
      productId.value = params?.id || getCurrentInstance()?.router?.params?.id || ''
      void loadProductDetail()
    })

    usePullDownRefresh(async () => {
      try {
        await loadProductDetail()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      errorMessage,
      handleDecreaseQuantity,
      handleIncreaseQuantity,
      handlePlaceOrder,
      isError,
      isFetching,
      isLoading,
      isSubmitting,
      loadProductDetail,
      orderAmountText,
      product,
      quantity,
      goBack,
      goHome
    }
  }
}
</script>