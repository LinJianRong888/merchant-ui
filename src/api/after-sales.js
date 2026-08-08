import Taro from '@tarojs/taro'
import { request, API_BASE_URL } from '@/utils/request'

/**
 * 上传售后凭证图片
 * POST /api/v1/uploads/images/ (multipart/form-data)
 * 返回 { upload_id, url, ... }
 */
export function uploadEvidenceImage (filePath, orderId) {
  return new Promise((resolve, reject) => {
    const token = Taro.getStorageSync('access_token')
      || Taro.getStorageSync('silent_token')
      || ''

    Taro.uploadFile({
      url: `${API_BASE_URL}/api/v1/uploads/images/`,
      filePath,
      name: 'file',
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      formData: {
        purpose: 'after_sale_evidence',
        context_id: Number(orderId)
      },
      success (res) {
        try {
          const data = JSON.parse(res.data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data)
          } else {
            const err = new Error(data?.detail || '图片上传失败')
            err.statusCode = res.statusCode
            err.data = data
            reject(err)
          }
        } catch (e) {
          reject(new Error('图片上传响应解析失败'))
        }
      },
      fail (err) {
        reject(err)
      }
    })
  })
}

/**
 * 创建售后申请
 * POST /api/v1/after-sales/
 */
export async function createAfterSale (data) {
  const response = await request.post('/api/v1/after-sales/', data)
  return ensureSuccessResponse(response, '创建售后申请失败', {
    url: '/api/v1/after-sales/',
    method: 'POST'
  })
}

/**
 * 查询售后申请列表
 * GET /api/v1/after-sales/
 * @param {Object} params - 可选查询参数，如 { order_id: 123 }
 */
export async function listAfterSales (params = {}) {
  const queryParams = { ...params }
  const response = await request.get('/api/v1/after-sales/', { data: queryParams })
  return ensureSuccessResponse(response, '获取售后列表失败', {
    url: '/api/v1/after-sales/',
    method: 'GET'
  })
}

/**
 * 查询售后申请详情
 * GET /api/v1/after-sales/{request_id}/
 */
export async function getAfterSaleDetail (requestId) {
  const response = await request.get(`/api/v1/after-sales/${requestId}/`)
  return ensureSuccessResponse(response, '获取售后详情失败', {
    url: `/api/v1/after-sales/${requestId}/`,
    method: 'GET'
  })
}

/**
 * 更新售后申请的退货物流信息
 * POST /api/v1/after-sales/{request_id}/return-logistics/ 优先
 * PATCH /api/v1/after-sales/{request_id}/ 兜底
 * @param {string|number} requestId - 售后申请ID
 * @param {Object} data - { return_courier_company, return_tracking_no }
 */
export async function updateAfterSaleReturnInfo (requestId, data) {
  try {
    const response = await request.patch(`/api/v1/after-sales/${requestId}/`, data)
    return ensureSuccessResponse(response, '更新退货物流失败', {
      url: `/api/v1/after-sales/${requestId}/`,
      method: 'PATCH'
    })
  } catch (patchErr) {
    const response = await request.post(`/api/v1/after-sales/${requestId}/return-logistics/`, data)
    return ensureSuccessResponse(response, '更新退货物流失败', {
      url: `/api/v1/after-sales/${requestId}/return-logistics/`,
      method: 'POST'
    })
  }
}

/**
 * 取消售后申请
 * POST /api/v1/after-sales/{request_id}/cancel/
 */
export async function cancelAfterSale (requestId, reason) {
  const response = await request.post(`/api/v1/after-sales/${requestId}/cancel/`, {
    reason: reason || ''
  })
  return ensureSuccessResponse(response, '取消售后申请失败', {
    url: `/api/v1/after-sales/${requestId}/cancel/`,
    method: 'POST'
  })
}

function ensureSuccessResponse (response, fallbackMessage, requestMeta) {
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  const payload = response?.data
  let message = fallbackMessage
  if (typeof payload === 'string' && payload.trim()) {
    message = payload
  } else if (payload?.detail) {
    message = payload.detail
  }

  const error = new Error(message)
  error.statusCode = response.statusCode
  error.response = response
  error.request = requestMeta
  throw error
}
