import { request } from '@/utils/request'

/**
 * POST /api/v1/invitations/merchant-miniapp/login/
 *
 * 商户端邀请登录：业务员(agent)通过小程序码邀请客户(customer)，
 * 客户扫码后使用微信登录 + 业务员邀请码完成注册。
 *
 * 后端行为：
 * - invite_code 必须匹配一个已存在的 agent 用户
 * - 如果当前 openid 没有 merchant 身份，直接创建 customer
 * - 如果已是 customer，返回已有身份登录结果
 * - 如果已绑定非 customer 角色，返回 409 冲突
 *
 * @param {string} code - wx.login() 返回的临时 code
 * @param {string} inviteCode - 从 QR 码 scene 中解析出的 agent 邀请码
 * @param {string} appSlug - 固定为 'merchant-miniapp'
 * @returns {Promise<{
 *   refresh: string,
 *   access: string,
 *   app_slug: 'merchant-miniapp',
 *   identity_id: number,
 *   user_id: number,
 *   is_new_user: boolean,
 *   user_type: 'customer',
 *   expired_at: string | null,
 *   openid: string,
 *   unionid: string,
 *   session_key: string
 * }>}
 */
export function merchantInvitationLogin ({ code, inviteCode, appSlug = 'merchant-miniapp' }) {
  return request.post('/api/v1/invitations/merchant-miniapp/login/', {
    app_slug: appSlug,
    code,
    invite_code: inviteCode
  }, {
    skipAuth: true
  })
}

/**
 * POST /api/v1/invitations/customer/bind-agent/
 *
 * 已登录的 customer 绑定邀请码，关联到 agent。
 *
 * @param {string} inviteCode - agent 邀请码
 */
export function bindInviteCode (inviteCode) {
  return request.post('/api/v1/invitations/customer/bind-agent/', {
    invite_code: inviteCode
  })
}