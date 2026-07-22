import { request, API_BASE_URL } from '@/utils/request'
import Taro from '@tarojs/taro'

/**
 * GET /api/v1/users/me/
 *
 * 获取当前登录用户的完整信息，包括 profile.phone。
 * 需要 JWT Bearer Token。
 *
 * @returns {Promise<{
 *   id: number,
 *   username: string,
 *   email: string,
 *   user_type: string,
 *   profile: { phone: string, ... } | null,
 *   ...
 * }>}
 */
export async function getCurrentUser () {
  const response = await request.get('/api/v1/users/me/')

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  throw new Error(response.data?.detail || '获取用户信息失败')
}

/**
 * PATCH /api/v1/users/me/ (NEW 2026-07-20)
 *
 * 更新当前用户的 profile name（仅 customer 和 agent）。
 * 更新的是 profile.name，不影响 username。
 *
 * @param {Object} data - { name: string }
 * @returns {Promise<Object>}
 */
export async function updateCurrentUser (data) {
  const response = await request.patch('/api/v1/users/me/', data)

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  // 尝试从多种格式中提取错误信息
  const detail = response.data?.detail
    || response.data?.message
    || (response.data?.profile?.name ? response.data.profile.name : null)
    || JSON.stringify(response.data)
  throw new Error(typeof detail === 'string' ? detail : '更新用户信息失败')
}

/**
 * POST /api/v1/users/me/avatar/
 *
 * 上传头像图片到后端。
 *
 * @param {string} filePath - 微信 chooseAvatar 返回的临时文件路径
 * @returns {Promise<{ avatar_url: string }>}
 */
export async function uploadAvatar (filePath) {
  const token = Taro.getStorageSync('access_token') || ''

  return new Promise((resolve, reject) => {
    Taro.uploadFile({
      url: `${API_BASE_URL}/api/v1/users/me/avatar/`,
      filePath,
      name: 'avatar',
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data)
          } else {
            reject(new Error(data?.detail || '上传头像失败'))
          }
        } catch {
          reject(new Error('解析响应失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}
