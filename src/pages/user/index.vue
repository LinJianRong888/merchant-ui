<template>
  <view class="user-page">
    <view class="user-header">
      <view class="user-info">
        <button
          v-if="isLoggedIn"
          class="avatar-btn"
          open-type="chooseAvatar"
          @chooseavatar="onChooseAvatar"
        >
          <image v-if="userInfo.avatarUrl" class="avatar-img" :src="userInfo.avatarUrl" mode="aspectFill" />
          <open-data v-else type="userAvatarUrl" class="avatar-open-data" />
        </button>
        <view v-else class="user-avatar" @tap="handleUserTap"></view>
        <view class="user-detail">
          <template v-if="isLoggedIn">
            <view v-if="userInfo.nickName" class="nickname-display" @tap="startEditNickname">
              <text class="nickname-text">{{ userInfo.nickName }}</text>
              <text class="edit-hint">✎</text>
            </view>
            <input
              v-else
              class="nickname-input"
              type="nickname"
              :value="userInfo.nickName"
              placeholder="点击设置昵称"
              @blur="onNicknameBlur"
              @confirm="onNicknameBlur"
            />
          </template>
          <text v-else class="user-name-blank" @tap="handleUserTap"> </text>
          <text v-if="isLoggedIn && displayPhone" class="user-phone">{{ displayPhone }}</text>
          <text v-else-if="!isLoggedIn" class="user-phone-hint" @tap="handleUserTap">点击登录</text>
          <button
            v-else
            class="get-phone-btn"
            open-type="getPhoneNumber"
            @getphonenumber="onGetPhoneNumber"
          >获取手机号</button>
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
    </view>

    <view v-if="isEditingNickname" class="nickname-edit-mask" @tap="cancelEditNickname">
      <view class="nickname-edit-popup" @tap.stop>
        <text class="nickname-edit-title">修改昵称</text>
        <input
          class="nickname-edit-input"
          type="nickname"
          :value="userInfo.nickName"
          placeholder="请输入昵称"
          :focus="isEditingNickname"
          @blur="onNicknameEditBlur"
          @confirm="onNicknameEditConfirm"
        />
      </view>
    </view>
  </view>
</template>

<script>
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listOrders } from '@/api/orders'
import { fetchWechatPhoneNumber } from '@/api/miniapp-auth'
import './index.scss'

const ADDRESSES_PAGE = '/pages/user/addresses/index'
const CART_PAGE = '/pages/cart/index'
const LOGIN_PAGE = '/pages/index/index'

export default {
  setup() {
    const authStore = useAuthStore()
    const orders = ref([])
    const isEditingNickname = ref(false)
    const userInfo = reactive({
      nickName: '',
      avatarUrl: ''
    })

    const isLoggedIn = computed(() => authStore.isAuthenticated)

    const displayPhone = computed(() => {
      if (!authStore.purePhoneNumber) return ''
      const phone = authStore.purePhoneNumber
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    })

    const pendingCount = computed(() => orders.value.filter(item => item.status === 'pending').length)
    const shippedCount = computed(() => orders.value.filter(item => item.status === 'paid').length)
    const receivedCount = computed(() => 0)
    const reviewedCount = computed(() => 0)

    async function loadOrders() {
      if (!authStore.isAuthenticated) return
      try {
        const response = await listOrders()
        orders.value = Array.isArray(response) ? response : []
      } catch (e) {
        orders.value = []
      }
    }

    function loadLocalUserInfo() {
      try {
        const saved = Taro.getStorageSync('wx_user_info')
        if (saved) {
          if (saved.nickName) userInfo.nickName = saved.nickName
          if (saved.avatarUrl) userInfo.avatarUrl = saved.avatarUrl
        }
      } catch (e) {}
    }

    function saveLocalUserInfo() {
      try {
        Taro.setStorageSync('wx_user_info', {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        })
      } catch (e) {}
    }

    function onChooseAvatar(e) {
      const avatarUrl = e.detail.avatarUrl
      if (avatarUrl) {
        userInfo.avatarUrl = avatarUrl
        saveLocalUserInfo()
      }
    }

    function onNicknameBlur(e) {
      const nickName = e.detail.value
      if (nickName && nickName.trim()) {
        userInfo.nickName = nickName.trim()
        saveLocalUserInfo()
      }
    }

    function startEditNickname() {
      isEditingNickname.value = true
    }

    function cancelEditNickname() {
      isEditingNickname.value = false
    }

    function onNicknameEditBlur(e) {
      const nickName = e.detail.value
      if (nickName && nickName.trim()) {
        userInfo.nickName = nickName.trim()
        saveLocalUserInfo()
      }
      isEditingNickname.value = false
    }

    function onNicknameEditConfirm(e) {
      const nickName = e.detail.value
      if (nickName && nickName.trim()) {
        userInfo.nickName = nickName.trim()
        saveLocalUserInfo()
      }
      isEditingNickname.value = false
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
        const response = await fetchWechatPhoneNumber({ code })
        const data = response.data || response
        authStore.setPhoneNumber({
          phone_number: data.phone_number || '',
          pure_phone_number: data.pure_phone_number || '',
          country_code: data.country_code || ''
        })
        Taro.showToast({ title: '手机号获取成功', icon: 'success' })
      } catch (err) {
        Taro.showToast({ title: '获取手机号失败', icon: 'none' })
      }
    }

    function handleUserTap() {
      if (!isLoggedIn.value) {
        Taro.navigateTo({ url: LOGIN_PAGE })
      }
    }

    useDidShow(() => {
      authStore.hydrate()
      void loadOrders()
      if (authStore.isAuthenticated) {
        loadLocalUserInfo()
      }
    })

    function goToAddresses() {
      Taro.navigateTo({
        url: ADDRESSES_PAGE
      })
    }

    function goToOrders(tab) {
      Taro.switchTab({
        url: CART_PAGE,
        success() {
          Taro.eventCenter.trigger('switchCartTab', tab || 'all')
        }
      })
    }

    function showComingSoon() {
      Taro.showToast({
        title: '功能开发中，敬请期待',
        icon: 'none'
      })
    }

    return {
      authStore,
      userInfo,
      isLoggedIn,
      isEditingNickname,
      displayPhone,
      pendingCount,
      shippedCount,
      receivedCount,
      reviewedCount,
      handleUserTap,
      onChooseAvatar,
      onNicknameBlur,
      startEditNickname,
      cancelEditNickname,
      onNicknameEditBlur,
      onNicknameEditConfirm,
      onGetPhoneNumber,
      goToAddresses,
      goToOrders,
      showComingSoon
    }
  }
}
</script>
