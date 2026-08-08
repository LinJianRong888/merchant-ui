<template>
  <view class="login-page">
    <view class="tea-bg">
      <view class="tea-wave tea-wave--1"></view>
      <view class="tea-wave tea-wave--2"></view>
      <view class="tea-wave tea-wave--3"></view>
    </view>

    <image class="login-logo" :src="logoImg" mode="aspectFit" />

    <view class="login-content">
      <view class="login-brand">
        <text class="login-brand__name"></text>
        <text class="login-brand__slogan">一杯好茶 · 一份心意</text>
      </view>

      <button
        class="login-button"
        :class="{ 'login-button--disabled': !agreedToTerms }"
        :loading="isSubmitting"
        :disabled="!agreedToTerms"
        open-type="getPhoneNumber"
        @getphonenumber="handleWechatLogin"
      >
        <view class="login-button__inner">
          <text class="login-button__icon">💬</text>
          <text>{{ primaryButtonText }}</text>
        </view>
      </button>

      <view class="login-agreement">
        <view class="login-agreement__left" @tap="toggleAgreement">
          <view :class="['agreement-checkbox', { 'agreement-checkbox--checked': agreedToTerms }]">
            <text v-if="agreedToTerms" class="agreement-checkbox__tick">✓</text>
          </view>
          <text class="agreement-text">已阅读并同意</text>
        </view>
        <text class="agreement-link" @tap="handleViewAgreement">《用户服务协议》</text>
        <text class="agreement-text">和</text>
        <text class="agreement-link" @tap="handleViewMerchantAgreement">《商户授权合作协议》</text>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useDidShow } from '@tarojs/taro'

import { loginWithWechatMiniapp, fetchWechatPhoneNumber, MERCHANT_MINIAPP_SLUG } from '@/api/miniapp-auth'
import { useAuthStore } from '@/stores/auth'

import logoImg from '@/assets/logo.png'
import './index.scss'

const HOME_PAGE_PATH = '/pages/home/index'

export default {
  setup () {
    const authStore = useAuthStore()
    const isSubmitting = ref(false)
    const isRedirecting = ref(false)

    const agreedToTerms = ref(false)

    const isAuthenticated = computed(() => authStore.isAuthenticated)
    const primaryButtonText = computed(() => {
      if (isSubmitting.value) {
        return '登录中'
      }

      return isAuthenticated.value ? '重新登录' : '手机号快捷登录'
    })

    async function redirectToHome () {
      if (isRedirecting.value) {
        return
      }

      isRedirecting.value = true

      try {
        await Taro.switchTab({
          url: HOME_PAGE_PATH
        })
      } finally {
        isRedirecting.value = false
      }
    }

    async function handleWechatLogin (e) {
      if (isSubmitting.value) {
        return
      }

      if (!agreedToTerms.value) {
        Taro.showToast({ title: '请先同意用户服务协议', icon: 'none' })
        return
      }

      isSubmitting.value = true

      try {
        // 1. 微信登录获取 code
        let loginRes

        try {
          loginRes = await Taro.login()
        } catch (error) {
          throw new Error(`Taro.login 调用失败\n${error?.errMsg || error?.message || String(error)}`)
        }

        if (!loginRes.code) {
          throw new Error(loginRes.errMsg || 'Taro.login 未返回 code')
        }

        // 2. 调用登录接口
        let response

        try {
          response = await loginWithWechatMiniapp({
            code: loginRes.code,
            appSlug: MERCHANT_MINIAPP_SLUG
          })
        } catch (error) {
          throw new Error([
            '后端登录接口调用失败',
            error?.message || String(error)
          ].join('\n'))
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          Taro.showToast({ title: '登录失败', icon: 'none' })
          return
        }

        authStore.setSession(response.data || {})

        // 3. 绑定手机号（微信手机号授权）
        const phoneCode = e?.detail?.code
        if (phoneCode) {
          try {
            const phoneResponse = await fetchWechatPhoneNumber({
              code: phoneCode,
              updateProfilePhone: true
            })

            if (phoneResponse.statusCode >= 200 && phoneResponse.statusCode < 300 && phoneResponse.data?.phone_number) {
              authStore.setPhoneNumber(phoneResponse.data)
              console.log('[login] 手机号绑定成功')
            } else {
              console.warn('[login] 手机号绑定失败:', phoneResponse.statusCode)
            }
          } catch (phoneErr) {
            console.warn('[login] 手机号绑定异常:', phoneErr?.message || phoneErr)
          }
        }

        Taro.showToast({ title: '登录成功', icon: 'success' })
        await redirectToHome()
      } catch (error) {
        Taro.showToast({
          title: error?.message || '登录异常',
          icon: 'none'
        })
      } finally {
        isSubmitting.value = false
      }
    }

    function toggleAgreement () {
      agreedToTerms.value = !agreedToTerms.value
    }

    function handleViewAgreement () {
      Taro.navigateTo({
        url: '/pages/user/agreement/index'
      })
    }

    function handleViewMerchantAgreement () {
      Taro.navigateTo({
        url: '/pages/user/merchant-agreement/index'
      })
    }

    useDidShow(() => {
      // force=true：401 跳转回来后 Storage 已清空，需强制从 Storage 重读
      authStore.hydrate(true)

      if (authStore.isAuthenticated) {
        void redirectToHome()
      }
    })

    return {
      logoImg,
      handleWechatLogin,
      isAuthenticated,
      isSubmitting,
      primaryButtonText,
      agreedToTerms,
      toggleAgreement,
      handleViewAgreement,
      handleViewMerchantAgreement
    }
  },

  onShareAppMessage () {
    return {
      title: '柑之怡商户端',
      path: '/pages/home/index'
    }
  }
}
</script>
