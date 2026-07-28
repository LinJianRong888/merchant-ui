<template>
  <view class="invite-entry-page">
    <!-- 已处理状态 -->
    <view v-if="status === 'done'" class="invite-done">
      <text class="invite-done-icon">✅</text>
      <text class="invite-done-title">加入成功</text>
      <text class="invite-done-desc">即将进入首页…</text>
    </view>

    <!-- 已登录且无邀请码 / 已绑定 -->
    <view v-else-if="status === 'already-bound'" class="invite-card">
      <text class="invite-title">您已是平台客户</text>
      <text class="invite-subtitle">无需重复加入，即将跳转首页…</text>
    </view>

    <!-- 检测中 -->
    <view v-else-if="status === 'checking'" class="invite-card">
      <text class="invite-title">正在验证...</text>
      <text class="invite-subtitle">请稍候</text>
    </view>

    <!-- 正常落地页 -->
    <view v-else class="invite-card">
      <view class="invite-logo">
        <text class="invite-logo-text">P</text>
      </view>

      <text class="invite-title">{{ inviteCode ? '您被邀请加入' : '未检测到邀请码' }}</text>
      <text class="invite-subtitle">{{ inviteCode ? '扫码即可成为客户，享受专属服务' : '请先联系客服获取邀请码后再加入' }}</text>

      <!-- 邀请码（脱敏展示） -->
      <view v-if="inviteCode" class="invite-code-row">
        <text class="invite-code-label">邀请码</text>
        <text class="invite-code-value">{{ maskedCode }}</text>
      </view>

      <!-- 错误提示 -->
      <view v-if="errorMsg" class="invite-error">
        <text>{{ errorMsg }}</text>
      </view>

      <!-- 有邀请码：一键加入按钮 -->
      <button
        v-if="inviteCode"
        class="invite-btn"
        :loading="loading"
        :disabled="loading"
        @tap="handleJoin"
      >
        <text>{{ loading ? '加入中…' : '一键加入' }}</text>
      </button>

      <!-- 无邀请码：联系客服按钮 -->
      <button
        v-else
        class="invite-btn invite-btn--service"
        open-type="contact"
      >
        <text>联系客服获取邀请码</text>
      </button>

      <text v-if="inviteCode" class="invite-footer-text">
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
  </view>
</template>

<script>
import { ref, computed } from 'vue'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { getCurrentEnterOptions, getScanEntryDebugInfo } from '@/utils/scan-entry'
import { merchantInvitationLogin, bindInviteCode as bindInviteCodeApi } from '@/api/invitation'
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
      authStore.hydrate()

      // 场景 A：未登录 → 正常显示邀请码卡片
      if (!authStore.isAuthenticated) {
        return
      }

      // 已登录但没有邀请码 → 回首页
      if (!inviteCode.value) {
        status.value = 'already-bound'
        setTimeout(() => {
          Taro.switchTab({ url: '/pages/home/index' })
        }, 1500)
        return
      }

      // 已登录 + 有邀请码 → 检查是否已绑定业务员
      status.value = 'checking'
      authStore.syncCanDoBusiness().then((success) => {
        if (!success) {
          // API 调用失败，无法判断是否已绑定 → 安全兜底，回首页
          status.value = 'already-bound'
          Taro.showModal({
            title: '提示',
            content: '网络异常，无法验证您的绑定状态，请稍后重试',
            showCancel: false,
            confirmText: '回到首页',
            success: () => {
              Taro.switchTab({ url: '/pages/home/index' })
            }
          })
          return
        }

        if (authStore.hasAgent) {
          // 场景 C：已绑定 → 提示无需重复绑定
          status.value = 'already-bound'
          Taro.showModal({
            title: '提示',
            content: '您已绑定业务员，无需重复绑定',
            showCancel: false,
            confirmText: '知道了',
            success: () => {
              Taro.switchTab({ url: '/pages/home/index' })
            }
          })
        } else {
          // 场景 B：未绑定 → 弹窗确认是否绑定
          status.value = 'ready'
          Taro.showModal({
            title: '绑定邀请码',
            content: '检测到新的邀请码，是否确认绑定？',
            confirmText: '确认绑定',
            cancelText: '暂不绑定',
            success: (res) => {
              if (res.confirm) {
                void handleBindExistingAuth()
              } else {
                Taro.switchTab({ url: '/pages/home/index' })
              }
            }
          })
        }
      })
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

    async function handleBindExistingAuth () {
      if (loading.value || !inviteCode.value) return

      loading.value = true

      try {
        const response = await bindInviteCodeApi(inviteCode.value)

        if (response.statusCode >= 200 && response.statusCode < 300) {
          Taro.setStorageSync('invite_bound', 'true')
          authStore.hasAgent = true
          Taro.showToast({ title: '邀请码绑定成功', icon: 'success', duration: 1500 })
          navigateToLogin()
        } else {
          Taro.showModal({
            title: '绑定失败',
            content: response.data?.detail || '绑定失败，是否重试？',
            confirmText: '重试',
            cancelText: '返回首页',
            success: (res) => {
              if (res.confirm) {
                void handleBindExistingAuth()
              } else {
                Taro.switchTab({ url: '/pages/home/index' })
              }
            }
          })
        }
      } catch (err) {
        console.error('[invite-entry] bind existing auth failed:', err)
        Taro.showModal({
          title: '绑定失败',
          content: err?.message || '网络异常，是否重试？',
          confirmText: '重试',
          cancelText: '返回首页',
          success: (res) => {
            if (res.confirm) {
              void handleBindExistingAuth()
            } else {
              Taro.switchTab({ url: '/pages/home/index' })
            }
          }
        })
      } finally {
        loading.value = false
      }
    }

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
          // 3. 存储 session，标记已绑定邀请码
          authStore.setSession(response.data)
          Taro.setStorageSync('invite_bound', 'true')

          if (response.data.is_new_user) {
            // 新用户 → 展示手机号绑定
            needBindPhone.value = true
            loading.value = false
            status.value = 'ready'
            Taro.showToast({ title: '注册成功，请绑定手机号', icon: 'none', duration: 1500 })
          } else {
            // 已有用户 → 直接跳转
            Taro.showToast({ title: '欢迎回来', icon: 'success', duration: 1200 })
            navigateToLogin()
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
          navigateToLogin()
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
      navigateToLogin()
    }

    function navigateToLogin () {
      status.value = 'done'
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/index/index' })
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
  },

  onShareAppMessage () {
    return {
      title: '柑之怡商户端',
      path: '/pages/home/index'
    }
  }
}
</script>