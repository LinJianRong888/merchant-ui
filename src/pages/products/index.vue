<template>
  <view class="products-page">
    <view class="page-header">
      <text class="page-title">商品</text>
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
      <text class="state-panel__desc">当前没有可售商品</text>
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
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useAppQuery } from '@/utils/app-query'

import { listSaleProducts } from '@/api/products'
import { useAuthStore } from '@/stores/auth'

import './index.scss'

const PRODUCT_DETAIL_PAGE = '/pages/products/detail/index'
const LOGIN_PAGE = '/pages/index/index'

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
  const lines = [error?.message || '请稍后重试']
  if (error?.statusCode) {
    lines.push(`status: ${error.statusCode}`)
  }
  return lines.join('\n')
}

export default {
  setup () {
    const authStore = useAuthStore()
    const skeletonItems = ['skeleton-1', 'skeleton-2', 'skeleton-3']
    const fallbackProducts = ref([])
    const fallbackError = ref(null)

    const {
      data: products,
      isLoading,
      isFetching,
      isError,
      error,
      refetch
    } = useAppQuery({
      queryKey: ['products', 'list'],
      queryFn: async () => normalizeProducts(await listSaleProducts()),
      enabled: computed(() => authStore.isAuthenticated)
    })

    const productList = computed(() => products.value || fallbackProducts.value)
    const hasError = computed(() => isError.value || Boolean(fallbackError.value))
    const errorMessage = computed(() => formatQueryError(fallbackError.value || error.value))

    async function loadProductsDirect () {
      console.info('[products-page] fallback load start')
      fallbackError.value = null
      fallbackProducts.value = normalizeProducts(await listSaleProducts())
      console.info('[products-page] fallback load success', {
        count: fallbackProducts.value.length
      })
    }

    async function refreshProducts () {
      fallbackError.value = null

      try {
        const result = await refetch()

        if (Array.isArray(result.data)) {
          fallbackProducts.value = []
          return
        }
      } catch (queryError) {
        fallbackError.value = queryError
      }

      try {
        await loadProductsDirect()
      } catch (directError) {
        fallbackError.value = directError
      }
    }

    async function navigateToLogin () {
      await Taro.redirectTo({
        url: LOGIN_PAGE
      })
    }

    async function ensureAuthenticated () {
      if (!authStore.isAuthenticated) {
        await navigateToLogin()
      }
    }

    async function handleRetry () {
      await refreshProducts()
    }

    async function handleOpenDetail (productId) {
      await Taro.navigateTo({
        url: `${PRODUCT_DETAIL_PAGE}?id=${productId}`
      })
    }

    useDidShow(() => {
      authStore.hydrate()
      void ensureAuthenticated()
      if (authStore.isAuthenticated) {
        void refreshProducts()
      }
    })

    usePullDownRefresh(async () => {
      try {
        await refreshProducts()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      errorMessage,
      handleRetry,
      handleOpenDetail,
      isError: hasError,
      isFetching,
      isLoading,
      products: productList,
      skeletonItems
    }
  }
}
</script>
