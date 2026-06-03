<template>
  <view class="invite-entry-page">
    <!-- 已处理状态 -->
    <view v-if="status === 'done'" class="invite-done">
      <text class="invite-done-icon">✅</text>
      <text class="invite-done-title">加入成功</text>
      <text class="invite-done-desc">即将进入首页…</text>
    </view>

    <!-- 正常落地页 -->
    <view v-else class="invite-card">
      <view class="invite-logo">
        <text class="invite-logo-text">P</text>
      </view>

      <text class="invite-title">您被邀请加入</text>
      <text class="invite-subtitle">扫码即可成为客户，享受专属服务</text>

      <!-- 邀请码（脱敏展示） -->
      <view v-if="inviteCode" class="invite-code-row">
        <text class="invite-code-label">邀请码</text>
        <text class="invite-code-value">{{ maskedCode }}</text>
      </view>

      <!-- 错误提示 -->
      <view v-if="errorMsg" class="invite-error">
        <text>{{ errorMsg }}</text>
      </view>

      <!-- 操作按钮 -->
      <button
        class="invite-btn"
        :loading="loading"
        :disabled="loading || !inviteCode"
        @tap="handleJoin"
      >
        <text>{{ loading ? '加入中…' : '一键加入' }}</text>
      </button>

      <text class="invite-footer-text">
        加入即代表您同意服务条款和隐私政策
      </text>

      <!-- 手机号绑定（新用户） -->
      <view v-if="needBindPhone" class="phone-section">
        <text class="phone-section-title">完成注册</text>
        <text class="phone-section-desc">绑定手机号以获得完整服务</text>
        <button
          class="phone-btn"
          open-type="getPhoneNumber"
          :loading="phoneLoading"
          :disabled="phoneLoading"
          @getphonenumber="handleGetPhoneNumber"
        >
          <text>{{ phoneLoading ? '绑定中…' : '微信手机号一键绑定' }}</text>
        </button>
        <button class="phone-skip-btn" @tap="handleSkipPhone">跳过，稍后绑定</button>
      </view>
    </view>

    <!-- 已登录提示 -->
    <view v-if="status === 'already-bound'" class="invite-card">
      <text class="invite-title">您已是平台客户</text>
      <text class="invite-subtitle">无需重复加入，即将跳转首页…</text>
    </view>
  </view>
</template>

<script>
import { ref, computed } from 'vue'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { getCurrentEnterOptions, getScanEntryDebugInfo } from '@/utils/scan-entry'
import { merchantInvitationLogin } from '@/api/invitation'
import { fetchWechatPhoneNumber } from '@/api/miniapp-auth'
import { useAuthStore } from '@/stores/auth'

import './index.scss'

export default {
  setup () {
    const authStore = useAuthStore()

    const inviteCode = ref('')
    const status = ref('ready') // ready | loading | already-bound | done
    const loading = ref(false)
    const errorMsg = ref('')

    const needBindPhone = ref(false)
    const phoneLoading = ref(false)

    const maskedCode = computed(() => {
      const code = inviteCode.value
      if (!code) return ''
      if (code.length <= 8) return code.slice(0, 4) + '****'
      return code.slice(0, 4) + '****' + code.slice(-4)
    })

    function parseInviteCode () {
      const enterOptions = getCurrentEnterOptions(Taro) || {}
      const info = getScanEntryDebugInfo({
        ...enterOptions,
        query: enterOptions.query || {}
      })

      console.log('[invite-entry] parsed', {
        inviteCode: info.inviteCode,
        source: info.inviteCodeSource
      })

      if (info.inviteCode) {
        inviteCode.value = info.inviteCode
      } else {
        // fallback: 尝试从页面路由参数中获取
        const pages = getCurrentPages()
        if (pages.length) {
          const params = pages[pages.length - 1].options || {}
          if (params.invite_code) {
            inviteCode.value = params.invite_code
          }
        }
      }
    }

    function checkExistingAuth () {
      // hydrate 在 app.js onLaunch 中已调用，这里再次确保同步
      authStore.hydrate()

      if (authStore.isAuthenticated) {
        // 已登录用户直接跳首页
        status.value = 'already-bound'
        setTimeout(() => {
          Taro.switchTab({ url: '/pages/home/index' })
        }, 1500)
        return true
      }

      return false
    }

    useLoad(() => {
      parseInviteCode()
      checkExistingAuth()
    })

    useDidShow(() => {
      // 防止从绑定页返回后状态异常
      if (status.value === 'ready' && !inviteCode.value) {
        parseInviteCode()
      }
    })

    async function handleJoin () {
      if (loading.value || !inviteCode.value) return

      loading.value = true
      errorMsg.value = ''
      status.value = 'loading'

      try {
        // 1. wx.login
        const loginRes = await Taro.login()
        if (!loginRes.code) {
          errorMsg.value = '微信登录失败，请在微信中打开'
          loading.value = false
          status.value = 'ready'
          return
        }

        // 2. 调用邀请登录接口
        const response = await merchantInvitationLogin({
          code: loginRes.code,
          inviteCode: inviteCode.value
        })

        if (response.statusCode >= 200 && response.statusCode < 300 && response.data?.access) {
          // 3. 存储 session
          authStore.setSession(response.data)

          if (response.data.is_new_user) {
            // 新用户 → 展示手机号绑定
            needBindPhone.value = true
            loading.value = false
            status.value = 'ready'
            Taro.showToast({ title: '注册成功，请绑定手机号', icon: 'none', duration: 1500 })
          } else {
            // 已有用户 → 直接跳转
            Taro.showToast({ title: '欢迎回来', icon: 'success', duration: 1200 })
            navigateToHome()
          }
        } else if (response.statusCode === 400) {
          errorMsg.value = '邀请码无效或已过期'
          loading.value = false
          status.value = 'ready'
        } else if (response.statusCode === 409) {
          errorMsg.value = '该微信账号已绑定为其他类型用户'
          loading.value = false
          status.value = 'ready'
        } else {
          errorMsg.value = response.data?.detail || `加入失败 (${response.statusCode})`
          loading.value = false
          status.value = 'ready'
        }
      } catch (err) {
        console.error('[invite-entry] join failed:', err)
        errorMsg.value = err?.message || '网络请求失败，请稍后重试'
        loading.value = false
        status.value = 'ready'
      }
    }

    async function handleGetPhoneNumber (e) {
      const phoneCode = e?.detail?.code
      if (!phoneCode) {
        Taro.showToast({ title: '未获取到手机号授权', icon: 'none' })
        return
      }

      phoneLoading.value = true

      try {
        const response = await fetchWechatPhoneNumber({
          code: phoneCode,
          updateProfilePhone: true
        })

        if (response.statusCode >= 200 && response.statusCode < 300 && response.data?.phone_number) {
          authStore.setPhoneNumber(response.data)
          Taro.showToast({ title: '手机号绑定成功', icon: 'success', duration: 1200 })
          navigateToHome()
        } else {
          Taro.showToast({ title: response.data?.detail || '手机号绑定失败', icon: 'none' })
        }
      } catch (err) {
        console.error('[invite-entry] phone bind failed:', err)
        Taro.showToast({ title: '手机号绑定失败，请重试', icon: 'none' })
      }

      phoneLoading.value = false
    }

    function handleSkipPhone () {
      Taro.showToast({ title: '已跳过，可稍后在"我的"页面绑定', icon: 'none', duration: 1500 })
      navigateToHome()
    }

    function navigateToHome () {
      status.value = 'done'
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' })
      }, 800)
    }

    return {
      inviteCode,
      maskedCode,
      status,
      loading,
      errorMsg,
      needBindPhone,
      phoneLoading,
      handleJoin,
      handleGetPhoneNumber,
      handleSkipPhone
    }
  }
}
</script>