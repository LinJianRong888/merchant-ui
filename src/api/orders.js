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

export async function createSaleOrder ({ productId, quantity, products, address }) {
  if (!address) {
    throw new Error('地址参数必填')
  }

  const items = []

  if (products && products.length > 0) {
    items.push(...products.map((product) => ({
      product_id: product.id,
      quantity: product.quantity
    })))
  } else if (productId) {
    items.push({
      product_id: productId,
      quantity
    })
  }

  if (!items.length) {
    throw new Error('商品参数必填')
  }

  const orderData = {
    order_type: ORDER_TYPE_SALE,
    items,
    address
  }

  const response = await request.post('/api/v1/orders/', orderData)

  return ensureSuccessResponse(response, '创建订单失败', {
    url: '/api/v1/orders/',
    method: 'POST'
  })
}

export async function createOrderPayment (orderId) {
  const response = await request.post(`/api/v1/orders/${orderId}/pay/`)

  return ensureSuccessResponse(response, '创建支付参数失败', {
    url: `/api/v1/orders/${orderId}/pay/`,
    method: 'POST'
  })
}

export async function getOrderDetail (orderId) {
  const response = await request.get(`/api/v1/orders/${orderId}/`)

  return ensureSuccessResponse(response, '获取订单详情失败', {
    url: `/api/v1/orders/${orderId}/`,
    method: 'GET'
  })
}

export async function listOrders () {
  const response = await request.get('/api/v1/orders/')

  return ensureSuccessResponse(response, '获取订单列表失败', {
    url: '/api/v1/orders/',
    method: 'GET'
  })
}

export async function cancelOrder (orderId) {
  const response = await request.post(`/api/v1/orders/${orderId}/cancel/`)

  return ensureSuccessResponse(response, '取消订单失败', {
    url: `/api/v1/orders/${orderId}/cancel/`,
    method: 'POST'
  })
}