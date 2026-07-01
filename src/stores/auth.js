import { defineStore } from 'pinia'
import Taro from '@tarojs/taro'

import { MERCHANT_MINIAPP_SLUG } from '@/api/miniapp-auth'
import { getCurrentUser } from '@/api/users'
import { getSigningStatus } from '@/api/esign'

const SESSION_STORAGE_KEY = 'auth_session'
const CACHE_CAN_DO_BUSINESS = 'can_do_business'

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
    canDoBusiness: false
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
    countryCode: state.countryCode
  })
}

function clearPersistedSession () {
  Taro.removeStorageSync('access_token')
  Taro.removeStorageSync('refresh_token')
  Taro.removeStorageSync(SESSION_STORAGE_KEY)
}

export const useAuthStore = defineStore('auth', {
  state: () => createDefaultState(),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    hasWechatIdentity: (state) => Boolean(state.openid)
  },
  actions: {
    hydrate () {
      const accessToken = Taro.getStorageSync('access_token') || ''
      const refreshToken = Taro.getStorageSync('refresh_token') || ''
      const session = Taro.getStorageSync(SESSION_STORAGE_KEY) || {}
      const cachedCanDoBusiness = Taro.getStorageSync(CACHE_CAN_DO_BUSINESS) ?? null

      this.$patch({
        ...createDefaultState(),
        ...session,
        accessToken,
        refreshToken,
        appSlug: session.appSlug || MERCHANT_MINIAPP_SLUG,
        canDoBusiness: typeof cachedCanDoBusiness === 'boolean'
          ? cachedCanDoBusiness
          : false
      })
    },

    /**
     * 与后端核对 can_do_business。
     * 先通过 getCurrentUser 获取 user_type，再调对应签约状态 API。
     * 非 agent 走 merchant-cooperation，agent 走 agent-cooperation。
     * 用签约状态 API 的 can_do_business 覆盖缓存和状态。
     */
    async syncCanDoBusiness () {
      if (!this.accessToken) return

      try {
        // 先获取 user_type
        const userInfo = await getCurrentUser()
        const userType = userInfo?.user_type || 'customer'

        // 调对应签约状态 API
        const signingStatus = await getSigningStatus(userType)
        const value = typeof signingStatus?.can_do_business === 'boolean'
          ? signingStatus.can_do_business
          : false

        this.canDoBusiness = value
        Taro.setStorageSync(CACHE_CAN_DO_BUSINESS, value)
      } catch {
        // 后端不可达时保持缓存值，不做修改
        console.warn('[auth] syncCanDoBusiness 失败，保持本地缓存值')
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

    clearSession () {
      this.$patch(createDefaultState())
      clearPersistedSession()
    }
  }
})