import Taro from '@tarojs/taro'

const BASE_URL = process.env.TARO_APP_API_URL || 'http://127.0.0.1:8000'
const LOGIN_PAGE_PATH = '/pages/index/index'

let isHandlingUnauthorized = false
let isRefreshingToken = false
let refreshPromise = null

function createDebugLabel (method, url) {
  return `[request] ${method.toUpperCase()} ${url}`
}

function safeSerialize (value) {
  if (value == null) {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return '[unserializable]'
  }
}

function getAccessToken () {
  try {
    const token = Taro.getStorageSync('access_token') || null
    if (token) return { token, source: 'auth' }
    const silentToken = Taro.getStorageSync('silent_token') || null
    if (silentToken) return { token: silentToken, source: 'silent' }
    return { token: null, source: null }
  } catch {
    return { token: null, source: null }
  }
}

function clearAuthStorage () {
  try {
    Taro.removeStorageSync('access_token')
    Taro.removeStorageSync('refresh_token')
    Taro.removeStorageSync('silent_token')
    Taro.removeStorageSync('auth_session')
  } catch {
  }
}

function getCurrentRoute () {
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []

    if (!pages.length) {
      return ''
    }

    return `/${pages[pages.length - 1].route}`
  } catch {
    return ''
  }
}

function handleUnauthorizedResponse () {
  if (isHandlingUnauthorized) {
    return
  }

  isHandlingUnauthorized = true
  clearAuthStorage()

  const currentRoute = getCurrentRoute()

  console.warn('[request] unauthorized', {
    currentRoute
  })

  if (currentRoute === LOGIN_PAGE_PATH) {
    isHandlingUnauthorized = false
    return
  }

  void Taro.reLaunch({
    url: LOGIN_PAGE_PATH,
    complete: () => {
      isHandlingUnauthorized = false
    }
  })
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
  const debugLabel = createDebugLabel(method, fullURL)

  const headers = {
    'Content-Type': 'application/json',
    ...header
  }

  let tokenSource = null

  if (!skipAuth) {
    const auth = getAccessToken()
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`
      tokenSource = auth.source
    }
  }

  console.info(`${debugLabel} start`, {
    hasAuth: Boolean(headers.Authorization),
    timeout,
    data: safeSerialize(data)
  })

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
    console.error(`${debugLabel} failed`, {
      message: error?.errMsg || error?.message || 'request failed',
      timeout,
      data: safeSerialize(data)
    })

    const requestError = new Error(error?.errMsg || error?.message || 'request failed')
    requestError.name = 'RequestError'
    requestError.cause = error
    requestError.request = {
      url: fullURL,
      method,
      timeout,
      data
    }
    throw requestError
  }

  console.info(`${debugLabel} success`, {
    statusCode: response.statusCode,
    data: safeSerialize(response.data)
  })

  console.debug(`${debugLabel} response json:`, JSON.stringify(response.data, null, 2))

  if (!skipAuth && response.statusCode === 401) {
    if (tokenSource === 'auth') {
      // 正式 token 过期 → 尝试 refresh
      let refreshed = false
      if (!isRefreshingToken) {
        const storedRefresh = Taro.getStorageSync('refresh_token')
        if (storedRefresh) {
          isRefreshingToken = true
          refreshPromise = (async () => {
            try {
              const res = await Taro.request({
                url: `${BASE_URL}/api/v1/token/refresh/`,
                method: 'POST',
                data: { refresh: storedRefresh },
                header: { 'Content-Type': 'application/json' },
                timeout: 15000
              })
              if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.access) {
                Taro.setStorageSync('access_token', res.data.access)
                if (res.data.refresh) {
                  Taro.setStorageSync('refresh_token', res.data.refresh)
                }
                return true
              }
              return false
            } catch {
              return false
            } finally {
              isRefreshingToken = false
              refreshPromise = null
            }
          })()
        }
      }
      if (refreshPromise) {
        refreshed = await refreshPromise
      }

      if (refreshed) {
        const auth = getAccessToken()
        if (auth.token) {
          headers.Authorization = `Bearer ${auth.token}`
        }
        return Taro.request({
          url: fullURL,
          method,
          data,
          header: headers,
          timeout
        }).then((retryResponse) => ({
          data: retryResponse.data,
          statusCode: retryResponse.statusCode,
          header: retryResponse.header
        }))
      }
      handleUnauthorizedResponse()
    } else if (tokenSource === 'silent') {
      // 静默 token 过期 → 清除并通知重新获取
      try { Taro.removeStorageSync('silent_token') } catch {}
      console.warn('[request] silent token expired, cleared')
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