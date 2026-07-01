import { request } from '@/utils/request'

// ---- 通用签约状态查询（根据 userType 自动选择接口） ----

/**
 * 根据用户类型获取签约状态。
 * agent → /api/v1/esign/agent-cooperation/status/
 * customer → /api/v1/esign/merchant-cooperation/status/
 *
 * @param {'agent' | 'customer'} userType
 */
export async function getSigningStatus (userType = 'customer') {
  const path = userType === 'agent'
    ? '/api/v1/esign/agent-cooperation/status/'
    : '/api/v1/esign/merchant-cooperation/status/'

  const response = await request.get(path)

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  throw new Error(response.data?.detail || '获取签约状态失败')
}

// ---- 发起签署 ----

/**
 * 根据用户类型发起签署流程。
 * agent → /api/v1/esign/agent-cooperation/start/
 * customer → /api/v1/esign/merchant-cooperation/start/
 *
 * @param {'agent' | 'customer'} userType
 * @param {Object} [params]
 * @param {Object} [params.fill_values]
 */
export async function startSigning (userType = 'customer', params = {}) {
  const path = userType === 'agent'
    ? '/api/v1/esign/agent-cooperation/start/'
    : '/api/v1/esign/merchant-cooperation/start/'

  const response = await request.post(path, params)

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  throw new Error(response.data?.detail || '发起签署失败')
}

// ---- 取消签署 ----

/**
 * 根据用户类型取消签署流程。
 * agent → /api/v1/esign/agent-cooperation/cancel/
 * customer → /api/v1/esign/merchant-cooperation/cancel/
 *
 * @param {'agent' | 'customer'} userType
 */
export async function cancelSigning (userType = 'customer') {
  const path = userType === 'agent'
    ? '/api/v1/esign/agent-cooperation/cancel/'
    : '/api/v1/esign/merchant-cooperation/cancel/'

  const response = await request.post(path, {})

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  throw new Error(response.data?.detail || '取消签署失败')
}
