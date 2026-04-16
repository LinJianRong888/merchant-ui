<template>
  <view class="products-page">
    <view class="products-page__glow products-page__glow--top"></view>
    <view class="products-page__glow products-page__glow--bottom"></view>

    <view class="products-page__header">
      <text class="products-page__eyebrow">sale products</text>
      <text class="products-page__title">商品</text>
    </view>

    <view v-if="isLoading" class="product-skeleton-list">
      <view v-for="item in skeletonItems" :key="item" class="product-card product-card--skeleton">
        <view class="product-card__media product-card__media--skeleton"></view>
        <view class="product-card__body">
          <view class="skeleton-line skeleton-line--title"></view>
          <view class="skeleton-line skeleton-line--meta"></view>
          <view class="skeleton-line skeleton-line--meta short"></view>
        </view>
      </view>
    </view>

    <view v-else-if="isError" class="state-panel">
      <text class="state-panel__title">加载失败</text>
      <text class="state-panel__desc">{{ errorMessage }}</text>
      <button class="state-panel__button" :loading="isFetching" @tap="handleRetry">重试</button>
    </view>

    <view v-else-if="!products.length" class="state-panel state-panel--empty">
      <text class="state-panel__title">暂无商品</text>
      <text class="state-panel__desc">当前没有可售商品。</text>
    </view>

    <view v-else class="product-list">
      <view v-for="product in products" :key="product.profile_id || product.id" class="product-card" @tap="handleOpenDetail(product.id)">
        <view class="product-card__media">
          <image
            v-if="product.coverImage"
            class="product-card__image"
            :src="product.coverImage"
            mode="aspectFill"
          />
          <view v-else class="product-card__placeholder">
            <text class="product-card__placeholder-text">{{ product.placeholderText }}</text>
          </view>
        </view>

        <view class="product-card__body">
          <view class="product-card__topline">
            <view class="product-card__title-wrap">
              <text class="product-card__name">{{ product.name }}</text>
              <text v-if="product.net_content" class="product-card__caption">净含量 {{ product.net_content }}</text>
            </view>
            <text class="product-card__price">{{ product.displayPrice }}</text>
          </view>

          <text v-if="product.description" class="product-card__desc">{{ product.description }}</text>

          <view class="product-card__meta-row">
            <text v-if="product.specification" class="product-chip">规格 {{ product.specification }}</text>
            <text v-if="product.packaging" class="product-chip">包装 {{ product.packaging }}</text>
          </view>

          <view class="product-card__meta-row product-card__meta-row--secondary">
            <text v-if="product.shelf_life" class="product-meta">保质期 {{ product.shelf_life }}</text>
            <text class="product-meta">库存 {{ product.displayStock }}</text>
            <text class="product-meta product-meta--link">查看详情</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { listSaleProducts } from '@/api/products'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '@/utils/request'

import './index.scss'

const PRODUCTS_PAGE_PATH = '/pages/products/index'
const PRODUCT_DETAIL_PAGE_PATH = '/pages/products/detail/index'
const LOGIN_PAGE_PATH = '/pages/index/index'

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

function normalizeProducts (items) {
  return items
    .filter((item) => item?.is_available)
    .map((item) => ({
      ...item,
      coverImage: item.image || item.product_image || '',
      displayPrice: formatPrice(item.price),
      displayStock: formatStock(item.stock),
      placeholderText: (item.name || '商品').slice(0, 1).toUpperCase()
    }))
}

function formatQueryError (error) {
  const requestMeta = error?.request
  const lines = [error?.message || '请稍后重试']

  if (requestMeta?.method && requestMeta?.url) {
    lines.push(`${requestMeta.method.toUpperCase()} ${requestMeta.url}`)
  }

  if (requestMeta?.timeout) {
    lines.push(`timeout: ${requestMeta.timeout}ms`)
  }

  return lines.join('\n')
}

export default {
  setup () {
    const authStore = useAuthStore()
    const skeletonItems = ['skeleton-1', 'skeleton-2', 'skeleton-3']
    const hasRunProbe = ref(false)
    const products = ref([])
    const isLoading = ref(true)
    const isFetching = ref(false)
    const loadError = ref(null)

    const isError = computed(() => Boolean(loadError.value))
    const errorMessage = computed(() => formatQueryError(loadError.value))

    async function navigateToLogin () {
      await Taro.redirectTo({
        url: LOGIN_PAGE_PATH
      })
    }

    async function ensureAuthenticated () {
      if (!authStore.isAuthenticated) {
        await navigateToLogin()
      }
    }

    async function handleRetry () {
      await loadProducts()
    }

    async function loadProducts () {
      if (isFetching.value) {
        return
      }

      isFetching.value = true
      loadError.value = null

      if (!products.value.length) {
        isLoading.value = true
      }

      try {
        const response = await listSaleProducts()
        products.value = normalizeProducts(response)
      } catch (error) {
        loadError.value = error
      } finally {
        isFetching.value = false
        isLoading.value = false
      }
    }

    async function handleOpenDetail (productId) {
      await Taro.navigateTo({
        url: `${PRODUCT_DETAIL_PAGE_PATH}?id=${productId}`
      })
    }

    async function runNetworkProbe () {
      const accessToken = Taro.getStorageSync('access_token') || ''
      const url = `${API_BASE_URL}/api/v1/products/`

      console.log('[products-page] probe start', {
        url,
        mode: 'sale',
        hasAuth: Boolean(accessToken),
        tokenLength: accessToken.length
      })

      try {
        const response = await Taro.request({
          url,
          method: 'GET',
          data: {
            mode: 'sale'
          },
          header: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          timeout: 15000
        })

        console.log('[products-page] probe success', {
          statusCode: response.statusCode,
          data: response.data
        })
      } catch (error) {
        console.error('[products-page] probe failed', {
          message: error?.errMsg || error?.message || 'request failed',
          url,
          hasAuth: Boolean(accessToken),
          tokenLength: accessToken.length
        })
      }
    }

    useDidShow(() => {
      console.info('[products-page] show', {
        isAuthenticated: authStore.isAuthenticated
      })

      if (!hasRunProbe.value) {
        hasRunProbe.value = true
        void runNetworkProbe()
      }

      void ensureAuthenticated()

      if (authStore.isAuthenticated) {
        void loadProducts()
      }
    })

    usePullDownRefresh(async () => {
      try {
        await loadProducts()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      errorMessage,
      handleRetry,
      handleOpenDetail,
      isError,
      isFetching,
      isLoading,
      products,
      skeletonItems,
      productsPagePath: PRODUCTS_PAGE_PATH
    }
  }
}
</script>