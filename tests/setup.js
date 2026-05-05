import { vi } from 'vitest'

// 全局 mock @tarojs/taro
vi.mock('@tarojs/taro', () => {
  const mockTaro = {
    default: {
      request: vi.fn(),
      getStorageSync: vi.fn((key) => {
        if (key === 'access_token') return 'mock-access-token'
        if (key === 'refresh_token') return 'mock-refresh-token'
        return null
      }),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      reLaunch: vi.fn(),
      showToast: vi.fn(),
      showModal: vi.fn(),
      navigateTo: vi.fn(),
      redirectTo: vi.fn(),
      switchTab: vi.fn(),
      requestPayment: vi.fn()
    },
    getCurrentInstance: vi.fn(() => ({ router: { params: {} } })),
    useDidShow: vi.fn(),
    useLoad: vi.fn(),
    usePullDownRefresh: vi.fn()
  }
  return mockTaro
})

// 全局 mock @/utils/request
vi.mock('@/utils/request', () => {
  const mockRequest = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
  return {
    request: mockRequest,
    API_BASE_URL: 'https://test-api.example.com',
    default: mockRequest
  }
})
