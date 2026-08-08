import { request } from '@/utils/request'

export const MERCHANT_MINIAPP_SLUG = 'merchant-miniapp'

export function loginWithWechatMiniapp ({ code, appSlug = MERCHANT_MINIAPP_SLUG }) {
  return request.post('/api/v1/wx/miniapp/login/', {
    app_slug: appSlug,
    code
  }, {
    skipAuth: true
  })
}

/**
 * 刷新 access_token，使用 refresh_token
 * 标准 DRF SimpleJWT refresh 端点
 */
export function refreshAccessToken (refreshToken) {
  return request.post('/api/v1/token/refresh/', {
    refresh: refreshToken
  }, {
    skipAuth: true
  })
}

export function fetchWechatUserInfo ({ openid, appSlug = MERCHANT_MINIAPP_SLUG }) {
  return request.post('/api/v1/wx/miniapp/user-info/', {
    app_slug: appSlug,
    openid
  })
}

export function fetchWechatPhoneNumber ({ code, appSlug = MERCHANT_MINIAPP_SLUG, updateProfilePhone = false }) {
  return request.post('/api/v1/wx/miniapp/phone-number/', {
    app_slug: appSlug,
    code,
    update_profile_phone: updateProfilePhone
  })
}
