<template>
  <view class="home-page">
    <view class="search-bar">
      <view class="search-input-wrapper">
        <view class="search-icon"></view>
        <input 
          class="search-input" 
          placeholder="请输入商品搜索" 
          placeholder-class="search-placeholder" 
          v-model="searchQuery"
        />
      </view>
    </view>

    <!-- 公告栏 -->
    <view v-if="!searchQuery.trim() && notices.length" class="notice-bar">
      <view class="notice-bar__icon"></view>
      <swiper class="notice-bar__swiper" :autoplay="true" :interval="3000" :circular="true" vertical>
        <swiper-item v-for="(item, index) in notices" :key="index">
          <text class="notice-bar__text">{{ item }}</text>
        </swiper-item>
      </swiper>
    </view>

    <!-- 搜索结果列表 -->
    <view v-if="searchQuery.trim()" class="search-results">
      <view class="section-header">
        <text class="section-title">搜索结果</text>
        <text class="result-count">共 {{ searchResults.length }} 个商品</text>
      </view>
      
      <view v-if="isLoading" class="product-grid">
        <view class="product-card product-card--skeleton" v-for="index in 3" :key="index">
          <view class="product-image product-image--skeleton"></view>
          <view class="product-skeleton-line"></view>
          <view class="product-skeleton-line product-skeleton-line--short"></view>
        </view>
      </view>
      
      <view v-else-if="!searchResults.length" class="empty-results">
        <text class="empty-text">未找到匹配的商品</text>
      </view>
      
      <view v-else class="product-grid">
        <view class="product-card" v-for="(product, index) in searchResults" :key="index" @tap="handleProductDetail(product.id)">
          <image v-if="product.coverImage" class="product-image" :src="product.coverImage" mode="aspectFill" />
          <view v-else class="product-image product-image--empty">
            <text class="product-image__text">{{ product.placeholderText }}</text>
          </view>
          <text class="product-name">{{ product.name }}</text>
          <text class="product-price">{{ product.displayPrice }}</text>
        </view>
      </view>
    </view>

    <!-- 未登录提示 -->
    <view v-if="!searchQuery.trim() && !authStore.isAuthenticated" class="login-notice" @tap="handleLoginPrompt">
      <view class="login-notice__icon"></view>
      <text class="login-notice__text">您还未登录，登录后方可使用更多功能</text>
      <text class="login-notice__arrow">›</text>
    </view>

    <!-- 轮播图 -->
    <swiper v-if="!searchQuery.trim() && banners.length" class="banner-swiper" :indicator-dots="true" :autoplay="true" :interval="3000" :duration="500">
      <swiper-item v-for="item in banners" :key="item.id">
        <image class="banner-image" :src="item.image" mode="aspectFill" />
      </swiper-item>
    </swiper>

    <view v-else-if="!searchQuery.trim()" class="banner-swiper banner-swiper--loading">
      <view class="banner-image banner-image--empty">
        <text class="banner-image__text">加载中...</text>
      </view>
    </view>

    <!-- 介绍 -->
    <view v-if="!searchQuery.trim()" class="intro-cards">
      <view class="intro-card" hover-class="intro-card--hover" @tap="toggleVideoIntro">
        <view class="intro-card__icon"></view>
        <text class="intro-card__title">视频介绍说明</text>
      </view>
    </view>

    <!-- 视频介绍展开 -->
    <view v-if="!searchQuery.trim() && videoExpanded" class="video-intro">
      <text class="video-intro__desc">点击下方视频了解更多产品详情与使用教程</text>
      <view class="video-list">
        <view class="video-item">
          <channel-video
            class="channel-video"
            finder-user-name="sphYEzSZhQGwmxh"
            feed-id="export/UzFfBgAAxKCBFCBPKAK6jMzT4DCauDwlGNQVW7bwuGuCVPH_Eg"
          />
          <text class="video-item__title">臻品堂生物科技有限公司，旗下品牌"柑之饴"，专注奶茶行业，让餐饮业也能赚奶茶行业的钱</text>
        </view>
        <!-- 视频2 -->
        <view class="video-item">
          <channel-video
            class="channel-video"
            finder-user-name="sphYEzSZhQGwmxh"
            feed-id="export/UzFfBgAAxL-BVD5TOVWDjMzT4DCadwITgbvaqlUAzjvlJpwYtw"
          />
          <text class="video-item__title">柑之饴奶茶浓缩液制作奶茶方法，简单快捷！</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { ref, computed, watch } from 'vue'
import { useAppQuery } from '@/utils/app-query'
import { useAuthStore } from '@/stores/auth'
import { listSaleProducts } from '@/api/products'
import './index.scss'

const PRODUCT_DETAIL_PAGE = '/pages/products/detail/index'

function formatPrice (price) {
  const value = Number(price)
  if (Number.isFinite(value)) {
    return `¥${value.toFixed(2)}`
  }
  return '¥--'
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

function formatStock (stock) {
  const value = Number(stock)
  if (Number.isFinite(value)) {
    return String(value)
  }
  return '--'
}

export default {
  setup() {
    const authStore = useAuthStore()
    const searchQuery = ref('')
    const fallbackProducts = ref([])
    const videoExpanded = ref(true)
    const notices = []

    function toggleVideoIntro() {
      videoExpanded.value = !videoExpanded.value
    }

    const {
      data: products,
      isLoading,
      isFetching,
      refetch
    } = useAppQuery({
      queryKey: ['products', 'home'],
      queryFn: async () => normalizeProducts(await listSaleProducts())
    })

    const productList = computed(() => products.value || fallbackProducts.value)

    async function loadProductsDirect() {
      console.info('[home-page] fallback load start')
      fallbackProducts.value = normalizeProducts(await listSaleProducts())
      console.info('[home-page] fallback load success', {
        count: fallbackProducts.value.length
      })
    }

    async function refreshProducts() {
      try {
        const result = await refetch()

        if (Array.isArray(result.data)) {
          fallbackProducts.value = []
          return
        }
      } catch {
      }

      await loadProductsDirect()
    }

    const banners = computed(() => productList.value
      .filter((item) => item.coverImage)
      .slice(0, 3)
      .map((item) => ({
        id: item.profile_id || item.id,
        image: item.coverImage,
        name: item.name
      })))

    // 搜索匹配的商品
    const searchResults = computed(() => {
      if (!searchQuery.value || searchQuery.value.trim() === '') {
        return []
      }
      
      const queryLower = searchQuery.value.toLowerCase()
      return productList.value.filter(product => 
        (product.name || '').toLowerCase().includes(queryLower)
      )
    })

    function handleSearchInput(e) {
      searchQuery.value = e.detail?.value || ''
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

    function handleProductDetail(productId) {
      Taro.navigateTo({
        url: `${PRODUCT_DETAIL_PAGE}?id=${productId}`
      })
    }

    useDidShow(() => {
      authStore.hydrate()
      void refreshProducts()
    })

    usePullDownRefresh(async () => {
      try {
        await refreshProducts()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    // 监听静默 token 就绪，自动重试加载
    watch(
      () => authStore.silentTokenVersion,
      (version) => {
        if (version > 0 && !authStore.isAuthenticated && !productList.value?.length) {
          console.log('[home-page] 检测到静默 token 就绪，重试加载商品')
          void refreshProducts()
        }
      }
    )

    return {
      authStore,
      banners,
      searchResults,
      isLoading,
      searchQuery,
      videoExpanded,
      toggleVideoIntro,
      notices,
      handleProductDetail,
      handleSearchInput,
      handleLoginPrompt,
    }
  },

  onShareAppMessage () {
    return {
      title: '柑之怡 - 品质奶茶原料供应商',
      path: '/pages/home/index'
    }
  },

  onShareTimeline () {
    return {
      title: '柑之怡 - 品质奶茶原料供应商'
    }
  }
}
</script>
