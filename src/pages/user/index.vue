<template>
  <view class="user-page">
    <view class="user-page__glow user-page__glow--top"></view>
    <view class="user-page__glow user-page__glow--bottom"></view>

    <view class="user-profile">
      <view class="user-profile__avatar">
        <text class="user-profile__avatar-text">我</text>
      </view>
      <view class="user-profile__info">
        <text class="user-profile__name">用户 {{ userId }}</text>
        <text class="user-profile__phone">{{ phoneNumber || '未绑定手机号' }}</text>
      </view>
    </view>

    <view class="user-menu">
      <view class="user-menu__item" @tap="handleOpenAddresses">
        <view class="user-menu__icon">📍</view>
        <view class="user-menu__content">
          <text class="user-menu__title">地址管理</text>
          <text class="user-menu__desc">管理收货地址</text>
        </view>
        <view class="user-menu__arrow">›</view>
      </view>

      <view class="user-menu__item" @tap="handleChangePassword">
        <view class="user-menu__icon">🔒</view>
        <view class="user-menu__content">
          <text class="user-menu__title">修改密码</text>
          <text class="user-menu__desc">更改账户密码</text>
        </view>
        <view class="user-menu__arrow">›</view>
      </view>

      <view class="user-menu__item user-menu__item--danger" @tap="handleLogout">
        <view class="user-menu__icon">🚪</view>
        <view class="user-menu__content">
          <text class="user-menu__title">退出登录</text>
          <text class="user-menu__desc">安全退出账户</text>
        </view>
        <view class="user-menu__arrow">›</view>
      </view>
    </view>

    <view class="user-footer">
      <text class="user-footer__version">版本 1.0.0</text>
    </view>
  </view>
</template>

<script>
import { computed } from 'vue'
import Taro from '@tarojs/taro'

import { useAuthStore } from '@/stores/auth'

import './index.scss'

const ADDRESSES_PAGE_PATH = '/pages/user/addresses/index'
const LOGIN_PAGE_PATH = '/pages/index/index'

export default {
  setup () {
    const authStore = useAuthStore()

    const userId = computed(() => authStore.userId)
    const phoneNumber = computed(() => authStore.phoneNumber)

    async function handleOpenAddresses () {
      await Taro.navigateTo({
        url: ADDRESSES_PAGE_PATH
      })
    }

    async function handleChangePassword () {
      Taro.showToast({
        title: '密码修改功能暂未开放',
        icon: 'none'
      })
    }

    async function handleLogout () {
      Taro.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: async (res) => {
          if (res.confirm) {
            authStore.clearSession()
            await Taro.reLaunch({
              url: LOGIN_PAGE_PATH
            })
          }
        }
      })
    }

    return {
      userId,
      phoneNumber,
      handleOpenAddresses,
      handleChangePassword,
      handleLogout
    }
  }
}
</script>