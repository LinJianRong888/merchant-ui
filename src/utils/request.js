import Taro from '@tarojs/taro'

const BASE_URL = process.env.TARO_APP_API_URL || 'http://127.0.0.1:8000'

function getAccessToken () {
  try {
    return Taro.getStorageSync('access_token') || null
  } catch {
    return null
  }
}

async function baseRequest (options) {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    skipAuth = false,
    timeout = 15000
  } = options

  const fullURL = url.startsWith('http') ? url : `${BASE_URL}${url}`

  const headers = {
    'Content-Type': 'application/json',
    ...header
  }

  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  let response

  try {
    response = await Taro.request({
      url: fullURL,
      method,
      data,
      header: headers,
      timeout
    })
  } catch (error) {
    const requestError = new Error(error?.errMsg || error?.message || 'request failed')
    requestError.name = 'RequestError'
    requestError.cause = error
    requestError.request = {
      url: fullURL,
      method,
      timeout
    }
    throw requestError
  }

  if (response.statusCode === 401) {
    try {
      Taro.removeStorageSync('access_token')
      Taro.removeStorageSync('refresh_token')
      Taro.removeStorageSync('auth_session')
    } catch {
    }
  }

  return {
    data: response.data,
    statusCode: response.statusCode,
    header: response.header
  }
}

export const request = {
  get: (url, options = {}) => baseRequest({ ...options, url, method: 'GET' }),
  post: (url, data, options = {}) => baseRequest({ ...options, url, method: 'POST', data }),
  put: (url, data, options = {}) => baseRequest({ ...options, url, method: 'PUT', data }),
  delete: (url, options = {}) => baseRequest({ ...options, url, method: 'DELETE' }),
  patch: (url, data, options = {}) => baseRequest({ ...options, url, method: 'PATCH', data })
}

export { BASE_URL as API_BASE_URL }

export default request