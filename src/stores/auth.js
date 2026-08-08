import { defineStore } from 'pinia'
import Taro from '@tarojs/taro'

import { MERCHANT_MINIAPP_SLUG } from '@/api/miniapp-auth'
import { getCurrentUser } from '@/api/users'
import { getSigningStatus } from '@/api/esign'

const SESSION_STORAGE_KEY = 'auth_session'

function createDefaultState () {
  return {
    appSlug: MERCHANT_MINIAPP_SLUG,
    accessToken: '',
    refreshToken: '',
    userId: null,
    identityId: null,
    openid: '',
    isNewUser: false,
    phoneNumber: '',
    purePhoneNumber: '',
    countryCode: '',
    canDoBusiness: false,
    esignCooperationSigned: false,
    hasAgent: false, // 是否已绑定业务员（自行填写 或 后端指派）
    silentTokenVersion: 0 // 静默 token 版本，变更时通知页面刷新
  }
}

function persistSession (state) {
  Taro.setStorageSync('access_token', state.accessToken || '')
  Taro.setStorageSync('refresh_token', state.refreshToken || '')
  Taro.setStorageSync(SESSION_STORAGE_KEY, {
    appSlug: state.appSlug,
    userId: state.userId,
    identityId: state.identityId,
    openid: state.openid,
    isNewUser: state.isNewUser,
    phoneNumber: state.phoneNumber,
    purePhoneNumber: state.purePhoneNumber,
    countryCode: state.countryCode,
    hasAgent: state.hasAgent,
    canDoBusiness: state.canDoBusiness,
    esignCooperationSigned: state.esignCooperationSigned
  })
}

function clearPersistedSession () {
  Taro.removeStorageSync('access_token')
  Taro.removeStorageSync('refresh_token')
  Taro.removeStorageSync('silent_token')
  Taro.removeStorageSync(SESSION_STORAGE_KEY)
}

export const useAuthStore = defineStore('auth', {
  state: () => createDefaultState(),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    hasWechatIdentity: (state) => Boolean(state.openid)
  },
  actions: {
    hydrate (force = false) {
      if (!force && this._hydrated) return

      const accessToken = Taro.getStorageSync('access_token') || ''
      const refreshToken = Taro.getStorageSync('refresh_token') || ''
      const session = Taro.getStorageSync(SESSION_STORAGE_KEY) || {}

      this._hydrated = true
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      this.appSlug = session.appSlug || MERCHANT_MINIAPP_SLUG
      this.userId = session.userId ?? null
      this.identityId = session.identityId ?? null
      this.openid = session.openid || ''
      this.isNewUser = Boolean(session.isNewUser)
      this.phoneNumber = session.phoneNumber || ''
      this.purePhoneNumber = session.purePhoneNumber || ''
      this.countryCode = session.countryCode || ''
      this.hasAgent = Boolean(session.hasAgent)
      this.canDoBusiness = typeof session.canDoBusiness === 'boolean' ? session.canDoBusiness : false
      this.esignCooperationSigned = typeof session.esignCooperationSigned === 'boolean' ? session.esignCooperationSigned : false
    },

    /**
     * 与后端核对 can_do_business。
     * 先通过 getCurrentUser 获取 user_type，再调对应签约状态 API。
     * 非 agent 走 merchant-cooperation，agent 走 agent-cooperation。
     * 用签约状态 API 的 can_do_business 覆盖缓存和状态。
     */
    async syncCanDoBusiness () {
      if (!this.accessToken) return false

      try {
        // 先获取 user_type
        const userInfo = await getCurrentUser()
        const userType = userInfo?.user_type || 'customer'

        // 调对应签约状态 API
        const signingStatus = await getSigningStatus(userType)
        // 签约状态 API 优先；若无则回退到用户 profile 中的值
        const value = typeof signingStatus?.can_do_business === 'boolean'
          ? signingStatus.can_do_business
          : (typeof userInfo?.profile?.can_do_business === 'boolean'
            ? userInfo.profile.can_do_business
            : false)

        this.canDoBusiness = value
        this.esignCooperationSigned = !!signingStatus?.esign_cooperation_signed
        // 判断是否有业务员：canDoBusiness 为 true 一定有；false 时看原因
        this.hasAgent = value || (signingStatus?.business_eligibility_reason !== 'customer_agent_not_assigned')
        // 状态变更后持久化，避免下次启动闪烁
        persistSession(this.$state)
        return true
      } catch (err) {
        console.warn('[auth] syncCanDoBusiness 失败，保持本地缓存值')
        return false
      }
    },

    setSession (payload) {
      this.$patch({
        appSlug: payload.app_slug || MERCHANT_MINIAPP_SLUG,
        accessToken: payload.access || '',
        refreshToken: payload.refresh || '',
        userId: payload.user_id ?? null,
        identityId: payload.identity_id ?? null,
        openid: payload.openid || '',
        isNewUser: Boolean(payload.is_new_user)
      })

      // 清理静默 token，后续使用正式 token
      Taro.removeStorageSync('silent_token')

      persistSession(this.$state)
    },

    setWechatUserInfo (payload) {
      this.$patch({
        appSlug: payload.app_slug || this.appSlug || MERCHANT_MINIAPP_SLUG,
        userId: payload.user_id ?? this.userId,
        identityId: payload.identity_id ?? this.identityId,
        openid: payload.openid || this.openid
      })

      persistSession(this.$state)
    },

    setPhoneNumber (payload) {
      this.$patch({
        phoneNumber: payload.phone_number || '',
        purePhoneNumber: payload.pure_phone_number || '',
        countryCode: payload.country_code || ''
      })

      persistSession(this.$state)
    },

    async clearSession () {
      this._hydrated = false
      this.$patch(createDefaultState())
      clearPersistedSession()
      // 清除邀请码绑定标记，避免换用户后残留
      try { Taro.removeStorageSync('invite_bound') } catch {}
      // 同步清空购物车
      try {
        const { useCartStore } = await import('@/stores/cart')
        const cartStore = useCartStore()
        if (cartStore) {
          await cartStore.clear()
        }
      } catch {
        // 清空购物车失败不影响登出
      }
    },

    notifySilentTokenReady () {
      this.silentTokenVersion += 1
    }
  }
})