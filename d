<template>
  <view class="user-page">
    <view class="user-header">
      <view class="user-info">
        <!-- 头像：点击可选择/更换（纯前端，存本地） -->
        <button
          v-if="isLoggedIn"
          class="avatar-btn"
          open-type="chooseAvatar"
          @chooseavatar="onChooseAvatar"
        >
          <image
            v-if="avatarUrl"
            :src="avatarUrl"
            class="avatar-image"
            mode="aspectFill"
          />
          <view v-else class="avatar-placeholder">
            <text class="avatar-placeholder-text">👤</text>
          </view>
        </button>
        <view v-else class="user-avatar" @tap="goToLogin">
          <text class="avatar-placeholder-text">👤</text>
        </view>

        <view class="user-detail">
          <text class="welcome-text">欢迎回来</text>

          <!-- 手机号：从后端 profile.phone 读取 -->
          <template v-if="isLoggedIn">
            <text v-if="profilePhone" class="user-phone">
              {{ maskPhone(profilePhone) }}
            </text>
            <button
              class="phone-action-btn"
              open-type="getPhoneNumber"
              @getphonenumber="onGetPhoneNumber"
            >
              {{ profilePhone ? '更新手机号' : '获取手机号' }}
            </button>
          </template>
          <text v-else class="user-phone-hint" @tap="goToLogin">点击登录</text>
        </view>
      </view>
    </view>

    <view class="order-section">
      <view class="order-header">
        <text class="order-title">我的订单</text>
        <view class="order-more" @tap="goToOrders('all')">
          <text class="order-more-text">全部订单</text>
          <text class="order-more-arrow">›</text>
        </view>
      </view>
      <view class="order-items">
        <view class="order-item" @tap="goToOrders('pending')">
          <view class="order-icon-wrap">
            <text class="order-icon">💳</text>
            <view v-if="pendingCount > 0" class="order-badge">
              <text class="order-badge-text">{{ pendingCount }}</text>
            </view>
          </view>
          <text class="order-label">待付款</text>
        </view>
        <view class="order-item" @tap="goToOrders('paid')">
          <view class="order-icon-wrap">
            <text class="order-icon">📦</text>
            <view v-if="shippedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ shippedCount }}</text>
            </view>
          </view>
          <text class="order-label">待发货</text>
        </view>
        <view class="order-item" @tap="goToOrders('shipped')">
          <view class="order-icon-wrap">
            <text class="order-icon">🚚</text>
            <view v-if="receivedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ receivedCount }}</text>
            </view>
          </view>
          <text class="order-label">待收货</text>
        </view>
        <view class="order-item" @tap="goToOrders('completed')">
          <view class="order-icon-wrap">
            <text class="order-icon">⭐</text>
            <view v-if="reviewedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ reviewedCount }}</text>
            </view>
          </view>
          <text class="order-label">待评价</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @tap="showComingSoon">
        <view class="menu-left">
          <text class="menu-icon">🎫</text>
          <text class="menu-text">优惠券</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goToAddresses">
        <view class="menu-left">
          <text class="menu-icon">📍</text>
          <text class="menu-text">收货地址</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="showComingSoon">
        <view class="menu-left">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-text">关于我们</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view v-if="isLoggedIn" class="menu-item" @tap="handleLogout">
        <view class="menu-left">
          <text class="menu-icon">↩</text>
          <text class="menu-text menu-text--danger">退出登录</text>
        </view>
        <text class="menu-arrow menu-arrow--danger">›</text>
      </view>
    </view>

  </view>
</template>

<script>
import Taro, { useDidShow } from '@tarojs/taro'
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import { getCurrentUser } from '@/api/users'
import { listOrders } from '@/api/orders'
import { fetchWechatPhoneNumber } from '@/api/miniapp-auth'
import './index.scss'

const ADDRESSES_PAGE = '/pages/user/addresses/index'
const ORDERS_PAGE = '/pages/orders/index'
const LOGIN_PAGE = '/pages/index/index'

const STORAGE_AVATAR_KEY = 'user_avatar_url'

export default {
  setup() {
    const authStore = useAuthStore()

    const isLoggedIn = computed(() => authStore.isAuthenticated)

    // ---- 头像（本地存储） ----
    const avatarUrl = ref(Taro.getStorageSync(STORAGE_AVATAR_KEY) || '')

    function onChooseAvatar(e) {
      const url = e.detail.avatarUrl
      if (url) {
        avatarUrl.value = url
        Taro.setStorageSync(STORAGE_AVATAR_KEY, url)
      }
    }

    // ---- 手机号（从后端读取） ----
    const {
      data: userInfo,
      refetch: refetchUser
    } = useQuery({
      queryKey: ['user-info'],
      queryFn: getCurrentUser,
      enabled: computed(() => authStore.isAuthenticated),
      retry: 1
    })

    const profilePhone = computed(() => {
      if (!userInfo.value) return ''
      return userInfo.value.profile?.phone || ''
    })

    function maskPhone(phone) {
      if (!phone || phone.length < 11) return phone
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }

    async function onGetPhoneNumber(e) {
      const detail = e.detail || {}
      if (detail.errMsg && !detail.errMsg.includes('ok')) {
        Taro.showToast({ title: '取消授权', icon: 'none' })
        return
      }
      const code = detail.code
      if (!code) {
        Taro.showToast({ title: '获取手机号失败', icon: 'none' })
        return
      }
      try {
        // 传 update_profile_phone: true，后端获取手机号的同时保存到 profile.phone
        const response = await fetchWechatPhoneNumber({ code, updateProfilePhone: true })
        const data = response.data || response

        // 更新本地 store（方便其他页面使用）
        authStore.setPhoneNumber({
          phone_number: data.phone_number || '',
          pure_phone_number: data.pure_phone_number || '',
          country_code: data.country_code || ''
        })

        // 重新读取后端用户信息，同步最新手机号
        await refetchUser()

        Taro.showToast({ title: '手机号已绑定', icon: 'success' })
      } catch (err) {
        Taro.showToast({ title: '获取手机号失败', icon: 'none' })
      }
    }

    // ---- 订单 ----
    const {
      data: orders
    } = useQuery({
      queryKey: ['orders', 'user-center'],
      queryFn: async () => {
        const response = await listOrders()
        return Array.isArray(response) ? response : []
      },
      enabled: computed(() => authStore.isAuthenticated)
    })

    const pendingCount = computed(() => (orders.value || []).filter(item => item.status === 'pending').length)
    const shippedCount = computed(() => (orders.value || []).filter(item => item.status === 'paid').length)
    const receivedCount = computed(() => 0)
    const reviewedCount = computed(() => 0)

    // ---- 生命周期 ----
    useDidShow(() => {
      authStore.hydrate()
      // 重新从本地读取头像（从其他页面返回后）
      avatarUrl.value = Taro.getStorageSync(STORAGE_AVATAR_KEY) || ''

      // 如果已登录，重新获取后端用户信息确保手机号最新
      if (authStore.isAuthenticated) {
        refetchUser()
      }
    })

    // ---- 导航 ----
    function goToLogin() {
      Taro.navigateTo({ url: LOGIN_PAGE })
    }

    function goToAddresses() {
      Taro.navigateTo({ url: ADDRESSES_PAGE })
    }

    function goToOrders(tab) {
      Taro.navigateTo({ url: `${ORDERS_PAGE}?tab=${tab || 'all'}` })
    }

    function handleLogout() {
      Taro.showModal({
        title: '退出登录',
        content: '确认退出当前账号吗？',
        success: (result) => {
          if (!result.confirm) return

          authStore.clearSession()

          void Taro.reLaunch({ url: LOGIN_PAGE })
        }
      })
    }

    function showComingSoon() {
      Taro.showToast({ title: '功能开发中，敬请期待', icon: 'none' })
    }

    return {
      isLoggedIn,
      avatarUrl,
      onChooseAvatar,
      profilePhone,
      maskPhone,
      onGetPhoneNumber,
      pendingCount,
      shippedCount,
      receivedCount,
      reviewedCount,
      goToLogin,
      goToAddresses,
      goToOrders,
      handleLogout,
      showComingSoon
    }
  }
}
</script>
