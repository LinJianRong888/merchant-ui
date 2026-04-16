<template>
  <view class="product-detail-page">
    <view class="product-detail-page__glow product-detail-page__glow--top"></view>
    <view class="product-detail-page__glow product-detail-page__glow--bottom"></view>

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
      <view class="product-detail-hero">
        <image
          v-if="product.coverImage"
          class="product-detail-hero__image"
          :src="product.coverImage"
          mode="aspectFill"
        />
        <view v-else class="product-detail-hero__placeholder">
          <text class="product-detail-hero__placeholder-text">{{ product.placeholderText }}</text>
        </view>
      </view>

      <view class="product-detail-card">
        <view class="product-detail-card__header">
          <view class="product-detail-card__title-block">
            <text class="product-detail-card__title">{{ product.name }}</text>
            <text v-if="product.description" class="product-detail-card__desc">{{ product.description }}</text>
          </view>
          <text class="product-detail-card__price">{{ product.displayPrice }}</text>
        </view>

        <view class="detail-grid">
          <view class="detail-grid__item">
            <text class="detail-grid__label">净含量</text>
            <text class="detail-grid__value">{{ product.net_content || '未填写' }}</text>
          </view>
          <view class="detail-grid__item">
            <text class="detail-grid__label">规格</text>
            <text class="detail-grid__value">{{ product.specification || '未填写' }}</text>
          </view>
          <view class="detail-grid__item">
            <text class="detail-grid__label">包装</text>
            <text class="detail-grid__value">{{ product.packaging || '未填写' }}</text>
          </view>
          <view class="detail-grid__item">
            <text class="detail-grid__label">保质期</text>
            <text class="detail-grid__value">{{ product.shelf_life || '未填写' }}</text>
          </view>
          <view class="detail-grid__item detail-grid__item--wide">
            <text class="detail-grid__label">库存</text>
            <text class="detail-grid__value">{{ product.displayStock }}</text>
          </view>
        </view>

        <view class="purchase-panel">
          <text class="purchase-panel__label">下单数量</text>
          <view class="purchase-stepper">
            <button class="purchase-stepper__button" :disabled="isSubmitting || quantity <= 1" @tap="handleDecreaseQuantity">-</button>
            <text class="purchase-stepper__value">{{ quantity }}</text>
            <button class="purchase-stepper__button" :disabled="isSubmitting" @tap="handleIncreaseQuantity">+</button>
          </view>
        </view>
      </view>

      <view class="detail-footer">
        <view class="detail-footer__summary">
          <text class="detail-footer__summary-label">合计</text>
          <text class="detail-footer__summary-value">{{ orderAmountText }}</text>
        </view>
        <button class="detail-order-button" :loading="isSubmitting" @tap="handlePlaceOrder">立即下单</button>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { getCurrentInstance, useLoad, usePullDownRefresh } from '@tarojs/taro'

import { createSaleOrder } from '@/api/orders'
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

    function handlePlaceOrder () {
      return (async () => {
        if (!product.value?.id || isSubmitting.value) {
          return
        }

        isSubmitting.value = true

        try {
          const order = await createSaleOrder({
            productId: product.value.id,
            quantity: quantity.value
          })

          console.log('[product-detail] place order success', order)

          await Taro.showModal({
            title: '下单成功',
            content: [
              `订单号：${order.order_no || '未返回'}`,
              `订单金额：¥${order.total_amount || '--'}`,
              `状态：${order.status || 'pending'}`
            ].join('\n'),
            showCancel: false,
            confirmText: '知道了'
          })
        } catch (error) {
          console.error('[product-detail] place order failed', error)
          Taro.showToast({
            title: error?.message || '下单失败',
            icon: 'none'
          })
        } finally {
          isSubmitting.value = false
        }
      })()
    }

    function handleDecreaseQuantity () {
      quantity.value = Math.max(1, quantity.value - 1)
    }

    function handleIncreaseQuantity () {
      quantity.value = Math.min(99, quantity.value + 1)
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
      quantity
    }
  }
}
</script>