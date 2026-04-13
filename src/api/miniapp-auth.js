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

export function fetchWechatUserInfo ({ openid, appSlug = MERCHANT_MINIAPP_SLUG }) {
  return request.post('/api/v1/wx/miniapp/user-info/', {
    app_slug: appSlug,
    openid
  })
}

export function fetchWechatPhoneNumber ({ code, appSlug = MERCHANT_MINIAPP_SLUG }) {
  return request.post('/api/v1/wx/miniapp/phone-number/', {
    app_slug: appSlug,
    code
  })
}