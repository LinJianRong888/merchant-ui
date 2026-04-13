import { defineStore } from 'pinia'
import Taro from '@tarojs/taro'

import { MERCHANT_MINIAPP_SLUG } from '@/api/miniapp-auth'

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
    countryCode: ''
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

      this.$patch({
        ...createDefaultState(),
        ...session,
        accessToken,
        refreshToken,
        appSlug: session.appSlug || MERCHANT_MINIAPP_SLUG
      })
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