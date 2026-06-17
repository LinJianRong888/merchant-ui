<template>
  <view class="user-page">
    <view class="user-header">
      <view class="user-card">
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
          <!-- 问候行 -->
          <view class="greeting-row">
            <text class="greeting-icon">☀️</text>
            <text class="greeting-text">{{ greetingText }}</text>
          </view>

          <!-- 姓名行 -->
          <template v-if="isLoggedIn">
            <view class="name-row">
              <text v-if="!isEditingNickname" class="user-name">{{ displayName || '用户' }}</text>
              <input
                v-else
                class="user-name-input"
                type="nickname"
                :value="displayName || '用户'"
                :placeholder="'点击填写昵称'"
                :focus="isEditingNickname"
                @blur="onNicknameChange"
              />
              <view
                class="name-edit-btn"
                @tap="startEditNickname"
                v-if="!isEditingNickname"
              >
                <text class="name-edit-icon">✏️</text>
              </view>
              <view class="role-tag">
                <text class="role-tag-text">会员</text>
              </view>
            </view>
          </template>

          <!-- 手机号行 -->
          <template v-if="isLoggedIn">
            <view class="phone-row">
              <text class="phone-icon">📱</text>
              <text class="user-phone" v-if="profilePhone">{{ maskPhone(profilePhone) }}</text>
              <text class="user-phone" v-else>未绑定</text>
              <button
                v-if="!pendingPhoneAuth"
                class="change-btn"
                @tap="handlePhoneChange"
              >更换</button>
              <button
                v-else
                class="change-btn"
                open-type="getPhoneNumber"
                @getphonenumber="onGetPhoneNumber"
              >点击授权</button>
            </view>
          </template>
          <text v-else class="login-hint" @tap="goToLogin">点击登录</text>
        </view>
      </view>

      <!-- 底部地址栏 -->
      <view class="address-bar">
        <view class="address-left">
          <text class="address-icon">📍</text>
          <text class="address-text">{{ defaultAddress || '广东江门' }}</text>
        </view>
        <view class="address-right" @tap="showComingSoon">
          <text class="daily-icon">💙</text>
          <text class="daily-text">今日活力满灌</text>
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
            <image class="order-icon-img" src="@/assets/order-pending.png" mode="aspectFit" />
            <view v-if="pendingCount > 0" class="order-badge">
              <text class="order-badge-text">{{ pendingCount }}</text>
            </view>
          </view>
          <text class="order-label">待处理</text>
        </view>
        <view class="order-item" @tap="goToOrders('paid')">
          <view class="order-icon-wrap">
            <image class="order-icon-img" src="@/assets/order-shipped.png" mode="aspectFit" />
            <view v-if="shippedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ shippedCount }}</text>
            </view>
          </view>
          <text class="order-label">待发货</text>
        </view>
        <view class="order-item" @tap="goToOrders('shipped')">
          <view class="order-icon-wrap">
            <image class="order-icon-img" src="@/assets/order-received.png" mode="aspectFit" />
            <view v-if="receivedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ receivedCount }}</text>
            </view>
          </view>
          <text class="order-label">待收货</text>
        </view>
        <view class="order-item" @tap="goToOrders('completed')">
          <view class="order-icon-wrap">
            <image class="order-icon-img" src="@/assets/order-completed.png" mode="aspectFit" />
            <view v-if="reviewedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ reviewedCount }}</text>
            </view>
          </view>
          <text class="order-label">已完成</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @tap="goToIceMachine">
        <view class="menu-left">
          <image class="menu-icon-img" src="@/assets/ice-machine.png" mode="aspectFit" />
          <text class="menu-text">制冰机</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="showComingSoon">
        <view class="menu-left">
          <image class="menu-icon-img" src="@/assets/coupon.png" mode="aspectFit" />
          <text class="menu-text">优惠券</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goToAddresses">
        <view class="menu-left">
          <image class="menu-icon-img" src="@/assets/address.png" mode="aspectFit" />
          <text class="menu-text">收货地址</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="showComingSoon">
        <view class="menu-left">
          <image class="menu-icon-img" src="@/assets/about.png" mode="aspectFit" />
          <text class="menu-text">关于我们</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view v-if="isLoggedIn" class="menu-item" @tap="handleLogout">
        <view class="menu-left">
          <image class="menu-icon-img" src="@/assets/logout.png" mode="aspectFit" />
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
import { listOrders } from '@/api/orders'
import { listUserAddresses } from '@/api/user-addresses'
import { fetchWechatPhoneNumber } from '@/api/miniapp-auth'
import './index.scss'

const ADDRESSES_PAGE = '/pages/user/addresses/index'
const ORDERS_PAGE = '/pages/orders/index'
const LOGIN_PAGE = '/pages/index/index'
const ICE_MACHINE_PAGE = '/pages/user/ice-machine/index'

const STORAGE_AVATAR_KEY = 'user_avatar_url'

export default {
  setup() {
    const authStore = useAuthStore()
    const isLoggedIn = computed(() => authStore.isAuthenticated)

    // ---- 头像（本地存储，无需后端） ----
    const avatarUrl = ref(Taro.getStorageSync(STORAGE_AVATAR_KEY) || '')

    function onChooseAvatar (e) {
      const url = e.detail?.avatarUrl
      if (url) {
        avatarUrl.value = url
        Taro.setStorageSync(STORAGE_AVATAR_KEY, url)
      }
    }

    // ---- 昵称（本地存储） ----
    const STORAGE_NICKNAME_KEY = 'user_nickname'
    const localNickname = ref(Taro.getStorageSync(STORAGE_NICKNAME_KEY) || '')
    const isEditingNickname = ref(false)

    function startEditNickname () {
      isEditingNickname.value = true
    }

    function onNicknameChange (e) {
      const name = e.detail?.value
      if (name) {
        localNickname.value = name
        Taro.setStorageSync(STORAGE_NICKNAME_KEY, name)
      }
      isEditingNickname.value = false
    }

    const pendingPhoneAuth = ref(false)

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
      // 已有手机号：弹窗确认后授权；未绑定：直接进入授权
      if (profilePhone.value) {
        Taro.showModal({
          title: '修改手机号',
          content: '确认将手机号修改为新授权的号码吗？',
          success: (res) => {
            if (res.confirm) {
              pendingPhoneAuth.value = true
            }
          }
        })
      } else {
        pendingPhoneAuth.value = true
      }
    }

    // ---- 订单 ----
    const {
      data: orders
    } = useAppQuery({
      queryKey: ['orders', 'user-center'],
      queryFn: async () => {
        const response = await listOrders()
        const list = Array.isArray(response) ? response : []
        console.log('[user-center] orders raw:', JSON.stringify(list.map(o => ({ id: o.id, status: o.status, shipment_status: o.shipment_status, status_label: o.status_label })), null, 2))
        return list
      },
      enabled: computed(() => authStore.isAuthenticated)
    })

    function isOrderCompleted(item) {
      return item?.status === 'completed'
    }

    const pendingCount = computed(() => (orders.value || []).filter(item => item.status === 'pending').length)
    const shippedCount = computed(() => (orders.value || []).filter(item => item.status === 'paid' && item.shipment_status !== 'shipped').length)
    const receivedCount = computed(() => (orders.value || []).filter(item => {
      return item.shipment_status === 'shipped' && !isOrderCompleted(item)
    }).length)
    const reviewedCount = computed(() => {
      const completed = (orders.value || []).filter(item => isOrderCompleted(item))
      console.log('[user-center] reviewedCount completed orders:', completed.map(o => ({ id: o.id, status: o.status, shipment_status: o.shipment_status })))
      return completed.length
    })

    // 问候语
    const greetingText = computed(() => {
      const hour = new Date().getHours()
      if (hour < 12) return '上午好'
      if (hour < 18) return '下午好'
      return '晚上好'
    })

    // 显示名称（优先本地昵称，其次 API profile.name）
    const displayName = computed(() => {
      return localNickname.value || userInfo.value?.profile?.name || ''
    })

    // 默认地址（从收货地址列表取第一条）
    const defaultAddress = ref('')

    async function fetchDefaultAddress () {
      try {
        const list = await listUserAddresses()
        if (Array.isArray(list) && list.length > 0) {
          const addr = list[0]
          defaultAddress.value = [addr.province, addr.city, addr.district]
            .filter(Boolean)
            .join('') + (addr.detail || '')
        }
      } catch {
        // 静默失败，保持占位文字
      }
    }

    // ---- 生命周期 ----
    useDidShow(() => {
      authStore.hydrate()
      // 刷新本地头像
      avatarUrl.value = Taro.getStorageSync(STORAGE_AVATAR_KEY) || ''
      // 如果已登录，刷新后端用户信息
      if (authStore.isAuthenticated) {
        refetchUser()
        fetchDefaultAddress()
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

    function goToIceMachine() {
      Taro.navigateTo({ url: ICE_MACHINE_PAGE })
    }

    function showComingSoon() {
      Taro.showToast({ title: '功能开发中，敬请期待', icon: 'none' })
    }

    return {
      isLoggedIn,
      avatarUrl,
      onChooseAvatar,
      onNicknameChange,
      isEditingNickname,
      startEditNickname,
      profilePhone,
      maskPhone,
      onGetPhoneNumber,
      handlePhoneChange,
      pendingPhoneAuth,
      pendingCount,
      shippedCount,
      receivedCount,
      reviewedCount,
      greetingText,
      displayName,
      defaultAddress,
      goToLogin,
      goToAddresses,
      goToOrders,
      goToIceMachine,
      handleLogout,
      showComingSoon
    }
  }
}
</script>
