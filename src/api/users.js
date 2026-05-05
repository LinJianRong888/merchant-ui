import { request } from '@/utils/request'

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
