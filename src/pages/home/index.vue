<template>
  <view class="home-page">
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input class="search-input" placeholder="请输入商品搜索" placeholder-class="search-placeholder" />
      </view>
    </view>

    <swiper v-if="banners.length" class="banner-swiper" :indicator-dots="true" :autoplay="true" :interval="3000" :duration="500">
      <swiper-item v-for="item in banners" :key="item.id">
        <image class="banner-image" :src="item.image" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <view v-else class="banner-swiper banner-swiper--empty">
      <view class="banner-image banner-image--empty">
        <text class="banner-image__text">暂无轮播图片</text>
      </view>
    </view>

    <view class="category-section">
      <view class="category-list">
        <view class="category-item" v-for="(item, index) in categories" :key="index" @tap="handleCategoryTap(item)">
          <view class="category-icon"></view>
          <text class="category-name">{{ item.name }}</text>
        </view>
      </view>
    </view>

    <view class="hot-section">
      <view class="section-header">
        <text class="section-title">热卖商品</text>
        <view class="more-btn" @tap="handleMoreProducts">
          <text class="more-text">更多</text>
          <text class="more-arrow">›</text>
        </view>
      </view>

      <view v-if="isLoading" class="product-grid">
        <view class="product-card product-card--skeleton" v-for="index in 3" :key="index">
          <view class="product-image product-image--skeleton"></view>
          <view class="product-skeleton-line"></view>
          <view class="product-skeleton-line product-skeleton-line--short"></view>
        </view>
      </view>

      <view v-else class="product-grid">
        <view class="product-card" v-for="(product, index) in hotProducts" :key="index" @tap="handleProductDetail(product.id)">
          <image v-if="product.coverImage" class="product-image" :src="product.coverImage" mode="aspectFill" />
          <view v-else class="product-image product-image--empty">
            <text class="product-image__text">{{ product.placeholderText }}</text>
          </view>
          <text class="product-name">{{ product.name }}</text>
          <text class="product-price">{{ product.displayPrice }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listSaleProducts } from '@/api/products'
import './index.scss'

const PRODUCT_DETAIL_PAGE = '/pages/products/detail/index'
const PRODUCTS_PAGE = '/pages/products/index'
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

export default {
  setup() {
    const authStore = useAuthStore()
    const products = ref([])
    const isLoading = ref(true)
    const isFetching = ref(false)

    const categories = ref([
      { name: '奶茶', icon: '' },
      { name: '制冰机', icon: '' },
      { name: '无1', icon: '' },
      { name: '无2', icon: '' },
      { name: '无3', icon: '' }
    ])

    const banners = computed(() => products.value
      .filter((item) => item.coverImage)
      .slice(0, 3)
      .map((item) => ({
        id: item.profile_id || item.id,
        image: item.coverImage,
        name: item.name
      })))

    const hotProducts = computed(() => products.value.slice(0, 3))

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

    async function loadProducts () {
      if (isFetching.value) {
        return
      }

      isFetching.value = true

      if (!products.value.length) {
        isLoading.value = true
      }

      try {
        const response = await listSaleProducts()
        products.value = normalizeProducts(response)
      } catch (error) {
        console.error('加载商品失败', error)
      } finally {
        isFetching.value = false
        isLoading.value = false
      }
    }

    function handleCategoryTap(category) {
      Taro.showToast({
        title: `进入${category.name}分类`,
        icon: 'none'
      })
    }

    function handleProductDetail(productId) {
      Taro.navigateTo({
        url: `${PRODUCT_DETAIL_PAGE}?id=${productId}`
      })
    }

    function handleMoreProducts() {
      Taro.switchTab({
        url: PRODUCTS_PAGE
      })
    }

    useDidShow(() => {
      authStore.hydrate()
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
      banners,
      categories,
      hotProducts,
      isLoading,
      handleCategoryTap,
      handleProductDetail,
      handleMoreProducts
    }
  }
}
</script>
