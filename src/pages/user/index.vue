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

          <template v-if="isLoggedIn">
            <text v-if="profilePhone" class="user-phone">
              {{ maskPhone(profilePhone) }}
            </text>
            <button
              v-if="profilePhone && !pendingPhoneAuth"
              class="phone-action-btn"
              @tap="handlePhoneChange"
            >修改手机号</button>
            <button
              v-else
              class="phone-action-btn"
              open-type="getPhoneNumber"
              @getphonenumber="onGetPhoneNumber"
            >{{ profilePhone ? '授权新手机号' : '获取手机号' }}</button>
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
          <text class="order-label">已完成</text>
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
import { useAppQuery } from '@/utils/app-query'
import { useAuthStore } from '@/stores/auth'
import { getCurrentUser } from '@/api/users'
import { listOrders, getOrderTracking } from '@/api/orders'
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

    // ---- 头像（本地存储，无需后端） ----
    const avatarUrl = ref(Taro.getStorageSync(STORAGE_AVATAR_KEY) || '')

    const pendingPhoneAuth = ref(false)

    function onChooseAvatar(e) {
      const url = e.detail && e.detail.avatarUrl
      if (!url) return
      avatarUrl.value = url
      Taro.setStorageSync(STORAGE_AVATAR_KEY, url)
    }

    // ---- 手机号（从后端 GET /api/v1/users/me/ 读取） ----
    const {
      data: userInfo,
      refetch: refetchUser
    } = useAppQuery({
      queryKey: ['user-info', 'me'],
      queryFn: getCurrentUser,
      enabled: computed(() => authStore.isAuthenticated),
      retry: 0
    })

    const profilePhone = computed(() => {
      const apiPhone = userInfo.value?.profile?.phone || ''
      const storePhone = authStore.purePhoneNumber || authStore.phoneNumber || ''
      return apiPhone || storePhone
    })

    function maskPhone(phone) {
      if (!phone || phone.length < 11) return phone
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }

    async function onGetPhoneNumber(e) {
      const detail = e.detail || {}
      if (detail.errMsg && !detail.errMsg.includes('ok')) {
        pendingPhoneAuth.value = false
        Taro.showToast({ title: '取消授权', icon: 'none' })
        return
      }
      const code = detail.code
      if (!code) {
        pendingPhoneAuth.value = false
        Taro.showToast({ title: '获取手机号失败', icon: 'none' })
        return
      }
      try {
        const response = await fetchWechatPhoneNumber({
          code,
          updateProfilePhone: true
        })
        const data = response.data || response

        authStore.setPhoneNumber({
          phone_number: data.phone_number || '',
          pure_phone_number: data.pure_phone_number || '',
          country_code: data.country_code || ''
        })

        await refetchUser()

        pendingPhoneAuth.value = false
        Taro.showToast({ title: profilePhone.value ? '手机号已修改' : '手机号已绑定', icon: 'success' })
      } catch (err) {
        pendingPhoneAuth.value = false
        const errMsg = (err && (err.message || err.errMsg || '')) || ''
        if (errMsg.includes('phone') || errMsg.includes('mobile') || errMsg.includes('手机号')) {
          Taro.showToast({ title: '暂不支持此手机号', icon: 'none' })
        } else {
          Taro.showToast({ title: '获取手机号失败', icon: 'none' })
        }
      }
    }

    function handlePhoneChange () {
      Taro.showModal({
        title: '修改手机号',
        content: '确认将手机号修改为新授权的号码吗？',
        success: (res) => {
          if (res.confirm) {
            pendingPhoneAuth.value = true
          }
        }
      })
    }

    // ---- 订单 ----
    const signedOrderIds = ref(new Set())
    const {
      data: orders
    } = useAppQuery({
      queryKey: ['orders', 'user-center'],
      queryFn: async () => {
        const response = await listOrders()
        const list = Array.isArray(response) ? response : []

        const shipped = list.filter(o => o.shipment_status === 'shipped')
        if (shipped.length > 0) {
          const trackingResults = await Promise.allSettled(
            shipped.map(o => getOrderTracking(o.id))
          )
          const signedSet = new Set()
          trackingResults.forEach((result, i) => {
            if (result.status === 'fulfilled') {
              const t = result.value
              if (t?.is_signed || t?.state_label === 'signed' || t?.state_label === 'delivered') {
                signedSet.add(String(shipped[i].id))
              }
            }
          })
          signedOrderIds.value = signedSet
        }

        return list
      },
      enabled: computed(() => authStore.isAuthenticated)
    })

    const pendingCount = computed(() => (orders.value || []).filter(item => item.status === 'pending').length)
    const shippedCount = computed(() => (orders.value || []).filter(item => item.status === 'paid' && item.shipment_status !== 'shipped').length)
    const receivedCount = computed(() => (orders.value || []).filter(item => {
      return item.shipment_status === 'shipped' && !signedOrderIds.value.has(String(item.id))
    }).length)
    const reviewedCount = computed(() => (orders.value || []).filter(item => {
      return item.status === 'completed' || signedOrderIds.value.has(String(item.id))
    }).length)

    // ---- 生命周期 ----
    useDidShow(() => {
      authStore.hydrate()
      // 刷新本地头像
      avatarUrl.value = Taro.getStorageSync(STORAGE_AVATAR_KEY) || ''
      // 如果已登录，刷新后端用户信息
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
      handlePhoneChange,
      pendingPhoneAuth,
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
