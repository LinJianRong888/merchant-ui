import Taro from '@tarojs/taro'

import { request, API_BASE_URL } from '@/utils/request'

export const PRODUCT_MODE_SALE = 'sale'

function ensureSuccessResponse (response, fallbackMessage) {
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  }

  const error = new Error(fallbackMessage)
  error.statusCode = response.statusCode
  error.response = response
  error.request = {
    url: `${API_BASE_URL}/api/v1/products/`,
    method: 'GET'
  }
  throw error
}

export async function listSaleProducts () {
  const accessToken = Taro.getStorageSync('access_token') || ''

  console.log('[products-api] listSaleProducts start', {
    url: `${API_BASE_URL}/api/v1/products/`,
    hasAuth: Boolean(accessToken),
    tokenLength: accessToken.length,
    mode: PRODUCT_MODE_SALE
  })

  const response = await request.get('/api/v1/products/', {
    data: {
      mode: PRODUCT_MODE_SALE
    }
  })

  console.log('[products-api] listSaleProducts response', {
    statusCode: response.statusCode
  })

  const data = ensureSuccessResponse(response, '获取商品列表失败')

  return Array.isArray(data) ? data : []
}

export async function getSaleProductDetail (productId) {
  const response = await request.get(`/api/v1/products/${productId}/`, {
    data: {
      mode: PRODUCT_MODE_SALE
    }
  })

  return ensureSuccessResponse(response, '获取商品详情失败')
}