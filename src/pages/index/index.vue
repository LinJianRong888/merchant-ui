<template>
  <view class="index-page">
    <view class="hero-card">
      <text class="hero-eyebrow">merchant-ui</text>
      <text class="hero-title">微信登录测试页</text>
      <text class="hero-desc">通过按钮触发 Taro.login，将 code 发送到后端微信小程序登录接口。</text>
    </view>

    <view class="panel">
      <view class="field">
        <text class="field-label">后端地址</text>
        <text class="field-value break-all">{{ apiBaseUrl }}</text>
      </view>
      <view class="field">
        <text class="field-label">app_slug</text>
        <text class="field-value">{{ appSlug }}</text>
      </view>
      <view class="field">
        <text class="field-label">当前状态</text>
        <text :class="['status-badge', isAuthenticated ? 'success' : 'idle']">{{ isAuthenticated ? '已登录' : '未登录' }}</text>
      </view>
      <view class="field">
        <text class="field-label">openid</text>
        <text class="field-value break-all">{{ openidText }}</text>
      </view>
      <view class="field">
        <text class="field-label">user_id</text>
        <text class="field-value">{{ userIdText }}</text>
      </view>
      <view class="field">
        <text class="field-label">identity_id</text>
        <text class="field-value">{{ identityIdText }}</text>
      </view>
      <view class="field">
        <text class="field-label">access_token</text>
        <text class="field-value break-all">{{ accessTokenPreview }}</text>
      </view>
    </view>

    <view class="actions">
      <button class="primary-btn" :loading="isSubmitting" @tap="handleWechatLogin">微信登录测试</button>
      <button class="ghost-btn" :disabled="isSubmitting" @tap="handleClearSession">清空本地会话</button>
    </view>

    <view class="panel">
      <text class="section-title">最近一次结果</text>
      <text class="result-text">{{ resultText }}</text>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro from '@tarojs/taro'

import { loginWithWechatMiniapp, MERCHANT_MINIAPP_SLUG } from '@/api/miniapp-auth'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '@/utils/request'

import './index.scss'

export default {
  setup () {
    const authStore = useAuthStore()
    const isSubmitting = ref(false)
    const resultText = ref('尚未触发登录。')

    const appSlug = computed(() => authStore.appSlug || MERCHANT_MINIAPP_SLUG)
    const isAuthenticated = computed(() => authStore.isAuthenticated)
    const openidText = computed(() => authStore.openid || '未返回')
    const userIdText = computed(() => authStore.userId ?? '未返回')
    const identityIdText = computed(() => authStore.identityId ?? '未返回')
    const accessTokenPreview = computed(() => {
      if (!authStore.accessToken) {
        return '未保存'
      }

      if (authStore.accessToken.length <= 24) {
        return authStore.accessToken
      }

      return `${authStore.accessToken.slice(0, 12)}...${authStore.accessToken.slice(-8)}`
    })

    async function handleWechatLogin () {
      if (isSubmitting.value) {
        return
      }

      isSubmitting.value = true
      resultText.value = '正在调用 Taro.login...'

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

        resultText.value = `已获取 code，正在请求后端登录：${loginRes.code}`

        let response

        try {
          response = await loginWithWechatMiniapp({
            code: loginRes.code,
            appSlug: MERCHANT_MINIAPP_SLUG
          })
        } catch (error) {
          const requestUrl = error?.request?.url || `${API_BASE_URL}/api/v1/wx/miniapp/login/`
          const timeout = error?.request?.timeout || 15000
          throw new Error([
            '后端登录接口调用失败',
            `url: ${requestUrl}`,
            `timeout: ${timeout}ms`,
            error?.message || String(error)
          ].join('\n'))
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          authStore.setSession(response.data || {})
          resultText.value = [
            '登录成功',
            `statusCode: ${response.statusCode}`,
            `user_id: ${response.data?.user_id ?? '未返回'}`,
            `identity_id: ${response.data?.identity_id ?? '未返回'}`,
            `openid: ${response.data?.openid || '未返回'}`,
            `is_new_user: ${String(Boolean(response.data?.is_new_user))}`
          ].join('\n')

          Taro.showToast({
            title: '登录成功',
            icon: 'success'
          })
          return
        }

        resultText.value = [
          '登录失败',
          `statusCode: ${response.statusCode}`,
          JSON.stringify(response.data || {}, null, 2)
        ].join('\n')

        Taro.showToast({
          title: '登录失败',
          icon: 'none'
        })
      } catch (error) {
        resultText.value = `登录异常\n${error?.message || String(error)}`
        Taro.showToast({
          title: '登录异常',
          icon: 'none'
        })
      } finally {
        isSubmitting.value = false
      }
    }

    function handleClearSession () {
      authStore.clearSession()
      resultText.value = '已清空 access_token、refresh_token 和 auth_session。'
      Taro.showToast({
        title: '已清空',
        icon: 'success'
      })
    }

    return {
      accessTokenPreview,
      apiBaseUrl: API_BASE_URL,
      appSlug,
      handleClearSession,
      handleWechatLogin,
      identityIdText,
      isAuthenticated,
      isSubmitting,
      openidText,
      resultText,
      userIdText
    }
  }
}
</script>
