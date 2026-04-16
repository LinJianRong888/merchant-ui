import { request } from '@/utils/request'

export const ORDER_TYPE_SALE = 'sale'

function extractErrorMessage (response, fallbackMessage) {
  const payload = response?.data

  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload?.detail) {
    return payload.detail
  }

  if (Array.isArray(payload?.non_field_errors) && payload.non_field_errors.length) {
    return payload.non_field_errors.join(' ')
  }

  return fallbackMessage
}

function ensureSuccessResponse (response, fallbackMessage, requestMeta) {
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  const error = new Error(extractErrorMessage(response, fallbackMessage))
  error.statusCode = response.statusCode
  error.response = response
  error.request = requestMeta
  throw error
}

export async function createSaleOrder ({ productId, quantity }) {
  const response = await request.post('/api/v1/orders/', {
    order_type: ORDER_TYPE_SALE,
    product_id: productId,
    quantity
  })

  return ensureSuccessResponse(response, '创建订单失败', {
    url: '/api/v1/orders/',
    method: 'POST'
  })
}

export async function listOrders () {
  const response = await request.get('/api/v1/orders/')

  return ensureSuccessResponse(response, '获取订单列表失败', {
    url: '/api/v1/orders/',
    method: 'GET'
  })
}