import { request } from '@/utils/request'

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

export async function listUserAddresses () {
  const response = await request.get('/api/v1/user-addresses/')

  return ensureSuccessResponse(response, '获取地址列表失败', {
    url: '/api/v1/user-addresses/',
    method: 'GET'
  })
}

export async function getUserAddress (addressId) {
  const response = await request.get(`/api/v1/user-addresses/${addressId}/`)

  return ensureSuccessResponse(response, '获取地址详情失败', {
    url: `/api/v1/user-addresses/${addressId}/`,
    method: 'GET'
  })
}

export async function createUserAddress (addressData) {
  const response = await request.post('/api/v1/user-addresses/', addressData)

  return ensureSuccessResponse(response, '创建地址失败', {
    url: '/api/v1/user-addresses/',
    method: 'POST'
  })
}

export async function updateUserAddress (addressId, addressData) {
  const response = await request.patch(`/api/v1/user-addresses/${addressId}/`, addressData)

  return ensureSuccessResponse(response, '更新地址失败', {
    url: `/api/v1/user-addresses/${addressId}/`,
    method: 'PATCH'
  })
}

export async function deleteUserAddress (addressId) {
  const response = await request.delete(`/api/v1/user-addresses/${addressId}/`)

  return ensureSuccessResponse(response, '删除地址失败', {
    url: `/api/v1/user-addresses/${addressId}/`,
    method: 'DELETE'
  })
}