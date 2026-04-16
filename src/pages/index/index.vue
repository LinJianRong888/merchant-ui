<template>
  <view class="login-page">
    <view class="login-page__glow login-page__glow--top"></view>
    <view class="login-page__glow login-page__glow--bottom"></view>

    <view class="login-shell">
      <view class="symbol-stage" aria-hidden="true">
        <view class="symbol-ring symbol-ring--large"></view>
        <view class="symbol-ring symbol-ring--small"></view>
        <view class="symbol-core">
          <view class="symbol-core__dot"></view>
        </view>
      </view>

      <view class="rhythm-bars" aria-hidden="true">
        <view class="rhythm-bars__item"></view>
        <view class="rhythm-bars__item"></view>
        <view class="rhythm-bars__item"></view>
      </view>

      <button class="login-button" :loading="isSubmitting" @tap="handleWechatLogin">
        {{ primaryButtonText }}
      </button>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useDidShow } from '@tarojs/taro'

import { loginWithWechatMiniapp, MERCHANT_MINIAPP_SLUG } from '@/api/miniapp-auth'
import { useAuthStore } from '@/stores/auth'

import './index.scss'

const PRODUCTS_PAGE_PATH = '/pages/products/index'

export default {
  setup () {
    const authStore = useAuthStore()
    const isSubmitting = ref(false)
    const isRedirecting = ref(false)

    const isAuthenticated = computed(() => authStore.isAuthenticated)
    const primaryButtonText = computed(() => {
      if (isSubmitting.value) {
        return '登录中'
      }

      return isAuthenticated.value ? '重新登录' : '微信一键登录'
    })

    async function redirectToProducts () {
      if (isRedirecting.value) {
        return
      }

      isRedirecting.value = true

      try {
        await Taro.redirectTo({
          url: PRODUCTS_PAGE_PATH
        })
      } finally {
        isRedirecting.value = false
      }
    }

    async function handleWechatLogin () {
      if (isSubmitting.value) {
        return
      }

      isSubmitting.value = true

      try {
        let loginRes

        try {
          loginRes = await Taro.login()
        } catch (error) {
          throw new Error(`Taro.login 调用失败\n${error?.errMsg || error?.message || String(error)}`)
        }

        if (!loginRes.code) {
          throw new Error(loginRes.errMsg || 'Taro.login 未返回 code')
        }

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

        if (response.statusCode >= 200 && response.statusCode < 300) {
          authStore.setSession(response.data || {})

          Taro.showToast({
            title: '登录成功',
            icon: 'success'
          })
          await redirectToProducts()
          return
        }

        Taro.showToast({
          title: '登录失败',
          icon: 'none'
        })
      } catch (error) {
        Taro.showToast({
          title: error?.message || '登录异常',
          icon: 'none'
        })
      } finally {
        isSubmitting.value = false
      }
    }

    useDidShow(() => {
      if (authStore.isAuthenticated) {
        void redirectToProducts()
      }
    })

    return {
      handleWechatLogin,
      isAuthenticated,
      isSubmitting,
      primaryButtonText
    }
  }
}
</script>
