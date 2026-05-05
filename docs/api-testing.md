# API 层测试方案

## 背景

本项目是一个 Taro4 + Vue3 微信小程序，API 层通过 `src/utils/request.js` 封装了 Taro.request，所有业务 API 集中在 `src/api/` 目录下。由于 UI 层由设计团队负责，我们需要一个**不依赖页面组件、不依赖小程序运行时**的测试方案，专门验证：

- API 请求/响应的正确性
- 数据转换逻辑（normalize/format）
- 错误处理逻辑
- 鉴权流程

## 推荐方案：Vitest + 直接调用 API 函数

### 为什么选 Vitest

| 特性 | 说明 |
|------|------|
| **与 Vite 同构** | 项目已使用 Vite 编译，Vitest 配置几乎为零 |
| **Node 环境运行** | 不需要小程序模拟器，纯 Node.js 执行 |
| **快速** | 基于 esbuild，毫秒级启动 |
| **兼容 Jest API** | describe/it/expect 全家桶 |
| **Mock 能力强** | vi.mock 可以轻松 mock Taro 和 request |

### 测试策略

```
测试层级：
┌─────────────────────────────┐
│  1. API 函数测试 (核心)      │  ← 直接调用 src/api/*.js 的函数
│     - 验证请求参数格式        │     验证请求是否正确发出
│     - 验证响应数据转换        │     验证返回数据是否被正确处理
│     - 验证错误处理           │
├─────────────────────────────┤
│  2. 数据转换函数测试          │  ← 测试 normalize/format 等纯函数
│     - formatPrice            │     不依赖任何外部环境
│     - normalizeProducts      │
│     - formatDateTime         │
├─────────────────────────────┤
│  3. Vue Query 集成测试       │  ← 验证 useQuery 的 queryFn
│     - queryFn 逻辑           │     验证 enabled 条件
│     - mutation 逻辑          │
└─────────────────────────────┘
```

## 实施步骤

### 1. 安装 Vitest

```bash
pnpm add -D vitest
```

### 2. 配置 Vitest

创建 `vitest.config.mjs`：

```js
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
```

### 3. 创建测试基础设施

创建 `tests/setup.js`：

```js
// 全局 mock Taro
vi.mock('@tarojs/taro', () => ({
  default: {
    request: vi.fn(),
    getStorageSync: vi.fn(),
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
}))

// 全局 mock request 工具
vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  API_BASE_URL: 'https://test-api.example.com'
}))
```

### 4. 编写测试用例

#### 4.1 API 函数测试（核心）

创建 `tests/api/products.test.js`：

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { request } from '@/utils/request'
import { listSaleProducts, getSaleProductDetail } from '@/api/products'

// Mock Taro.getStorageSync 返回 token
vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: vi.fn((key) => {
      if (key === 'access_token') return 'mock-token-123'
      return null
    }),
    request: vi.fn()
  }
}))

describe('products API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listSaleProducts', () => {
    it('应该以 sale mode 请求商品列表', async () => {
      // 模拟成功响应
      request.get.mockResolvedValue({
        statusCode: 200,
        data: [{ id: 1, name: '商品A', price: '100.00', is_available: true }]
      })

      const result = await listSaleProducts()

      // 验证请求参数
      expect(request.get).toHaveBeenCalledWith('/api/v1/products/', {
        data: { mode: 'sale' }
      })

      // 验证返回数据
      expect(result).toEqual([
        { id: 1, name: '商品A', price: '100.00', is_available: true }
      ])
    })

    it('请求失败时应抛出错误', async () => {
      request.get.mockResolvedValue({
        statusCode: 500,
        data: { detail: '服务器错误' }
      })

      await expect(listSaleProducts()).rejects.toThrow('获取商品列表失败')
    })

    it('返回非数组时应返回空数组', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: { results: [] }  // 非数组格式
      })

      const result = await listSaleProducts()
      expect(result).toEqual([])
    })
  })

  describe('getSaleProductDetail', () => {
    it('应该请求指定商品的详情', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: { id: 1, name: '商品A', price: '100.00' }
      })

      const result = await getSaleProductDetail(1)

      expect(request.get).toHaveBeenCalledWith('/api/v1/products/1/', {
        data: { mode: 'sale' }
      })
      expect(result.name).toBe('商品A')
    })
  })
})
```

#### 4.2 数据转换函数测试

创建 `tests/utils/normalizers.test.js`：

```js
import { describe, it, expect } from 'vitest'

// 直接从页面源码中提取的纯函数
function formatPrice(price) {
  const value = Number(price)
  if (Number.isFinite(value)) {
    return `¥${value.toFixed(2)}`
  }
  return '¥--'
}

function formatStock(stock) {
  const value = Number(stock)
  if (Number.isFinite(value)) {
    return String(value)
  }
  return '--'
}

function normalizeProducts(items) {
  return items
    .filter((item) => item?.is_available)
    .map((item) => ({
      ...item,
      coverImage: item.image || item.product_image || '',
      displayPrice: formatPrice(item.price),
      displayStock: formatStock(item.stock),
      placeholderText: (item.name || '商品').slice(0, 1).toUpperCase()
    }))
}

describe('数据转换函数', () => {
  describe('formatPrice', () => {
    it('正常价格应格式化为 ¥xx.xx', () => {
      expect(formatPrice('100')).toBe('¥100.00')
      expect(formatPrice(99.9)).toBe('¥99.90')
      expect(formatPrice('0')).toBe('¥0.00')
    })

    it('无效价格应返回 ¥--', () => {
      expect(formatPrice(null)).toBe('¥--')
      expect(formatPrice(undefined)).toBe('¥--')
      expect(formatPrice('abc')).toBe('¥--')
    })
  })

  describe('normalizeProducts', () => {
    it('应过滤掉不可售商品', () => {
      const items = [
        { id: 1, name: 'A', price: '10', is_available: true },
        { id: 2, name: 'B', price: '20', is_available: false }
      ]
      const result = normalizeProducts(items)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('应添加 coverImage 和 displayPrice 字段', () => {
      const items = [
        { id: 1, name: '测试商品', price: '50', image: 'http://img.url', is_available: true }
      ]
      const result = normalizeProducts(items)
      expect(result[0].coverImage).toBe('http://img.url')
      expect(result[0].displayPrice).toBe('¥50.00')
      expect(result[0].placeholderText).toBe('测')
    })
  })
})
```

#### 4.3 订单 API 测试

创建 `tests/api/orders.test.js`：

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { request } from '@/utils/request'
import { createSaleOrder, createOrderPayment, listOrders, cancelOrder } from '@/api/orders'

describe('orders API', () => {
  const mockAddress = {
    contact_name: '张三',
    contact_phone: '13800138000',
    province: '广东省',
    city: '深圳市',
    district: '南山区',
    address_detail: '科技园'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSaleOrder', () => {
    it('单商品下单应发送正确的请求体', async () => {
      request.post.mockResolvedValue({
        statusCode: 201,
        data: { id: 1, order_no: 'ORD001', status: 'pending' }
      })

      const result = await createSaleOrder({
        productId: 1,
        quantity: 2,
        address: mockAddress
      })

      expect(request.post).toHaveBeenCalledWith('/api/v1/orders/', {
        order_type: 'sale',
        product_id: 1,
        quantity: 2,
        address: mockAddress
      })
      expect(result.id).toBe(1)
    })

    it('多商品下单应发送 products 数组', async () => {
      request.post.mockResolvedValue({
        statusCode: 201,
        data: { id: 2, order_no: 'ORD002' }
      })

      const result = await createSaleOrder({
        products: [{ id: 1, quantity: 2 }, { id: 2, quantity: 1 }],
        address: mockAddress
      })

      expect(request.post).toHaveBeenCalledWith('/api/v1/orders/', {
        order_type: 'sale',
        products: [{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 1 }],
        address: mockAddress
      })
    })

    it('缺少地址参数应抛出错误', async () => {
      await expect(createSaleOrder({
        productId: 1,
        quantity: 1
      })).rejects.toThrow('地址参数必填')
    })

    it('缺少商品参数应抛出错误', async () => {
      await expect(createSaleOrder({
        address: mockAddress
      })).rejects.toThrow('商品参数必填')
    })
  })

  describe('createOrderPayment', () => {
    it('应请求支付参数', async () => {
      request.post.mockResolvedValue({
        statusCode: 200,
        data: {
          request_payment: {
            timeStamp: '1234567890',
            nonceStr: 'nonce',
            package: 'prepay_id=wx123',
            signType: 'MD5',
            paySign: 'signature'
          }
        }
      })

      const result = await createOrderPayment(1)
      expect(request.post).toHaveBeenCalledWith('/api/v1/orders/1/pay/')
      expect(result.request_payment.timeStamp).toBe('1234567890')
    })
  })

  describe('cancelOrder', () => {
    it('应请求取消订单', async () => {
      request.post.mockResolvedValue({
        statusCode: 200,
        data: { success: true }
      })

      await cancelOrder(1)
      expect(request.post).toHaveBeenCalledWith('/api/v1/orders/1/cancel/')
    })
  })
})
```

#### 4.4 地址 API 测试

创建 `tests/api/user-addresses.test.js`：

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { request } from '@/utils/request'
import { listUserAddresses, createUserAddress, updateUserAddress, deleteUserAddress } from '@/api/user-addresses'

describe('user-addresses API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listUserAddresses', () => {
    it('应请求地址列表', async () => {
      request.get.mockResolvedValue({
        statusCode: 200,
        data: [{ id: 1, contact_name: '张三' }]
      })

      const result = await listUserAddresses()
      expect(request.get).toHaveBeenCalledWith('/api/v1/user-addresses/')
      expect(result).toHaveLength(1)
    })
  })

  describe('createUserAddress', () => {
    it('应发送正确的地址数据', async () => {
      const addressData = {
        contact_name: '李四',
        contact_phone: '13900139000',
        province: '广东省',
        city: '广州市',
        district: '天河区',
        address_detail: '珠江新城'
      }

      request.post.mockResolvedValue({
        statusCode: 201,
        data: { id: 2, ...addressData }
      })

      const result = await createUserAddress(addressData)
      expect(request.post).toHaveBeenCalledWith('/api/v1/user-addresses/', addressData)
      expect(result.id).toBe(2)
    })
  })

  describe('deleteUserAddress', () => {
    it('应请求删除地址', async () => {
      request.delete.mockResolvedValue({
        statusCode: 204,
        data: null
      })

      await deleteUserAddress(1)
      expect(request.delete).toHaveBeenCalledWith('/api/v1/user-addresses/1/')
    })
  })
})
```

#### 4.5 鉴权 API 测试

创建 `tests/api/auth.test.js`：

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { request } from '@/utils/request'
import { loginWithWechatMiniapp, fetchWechatUserInfo, fetchWechatPhoneNumber } from '@/api/miniapp-auth'

describe('miniapp-auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loginWithWechatMiniapp', () => {
    it('应使用 skipAuth 发送登录请求', async () => {
      request.post.mockResolvedValue({
        statusCode: 200,
        data: { access: 'access-token', refresh: 'refresh-token' }
      })

      const result = await loginWithWechatMiniapp({ code: 'wx-code-123' })

      expect(request.post).toHaveBeenCalledWith('/api/v1/wx/miniapp/login/', {
        app_slug: 'merchant-miniapp',
        code: 'wx-code-123'
      }, { skipAuth: true })
      expect(result.data.access).toBe('access-token')
    })
  })

  describe('fetchWechatPhoneNumber', () => {
    it('应请求手机号', async () => {
      request.post.mockResolvedValue({
        statusCode: 200,
        data: { phone_number: '13800138000', pure_phone_number: '13800138000' }
      })

      const result = await fetchWechatPhoneNumber({ code: 'phone-code' })
      expect(request.post).toHaveBeenCalledWith('/api/v1/wx/miniapp/phone-number/', {
        app_slug: 'merchant-miniapp',
        code: 'phone-code'
      })
    })
  })
})
```

#### 4.6 请求工具测试

创建 `tests/utils/request.test.js`：

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 注意：request.js 依赖 Taro，需要完整 mock
// 这里测试的是 request 工具的核心逻辑

describe('request 工具', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET 请求应正确拼接 URL', async () => {
    const { request } = await import('@/utils/request')
    const Taro = await import('@tarojs/taro')

    Taro.default.getStorageSync.mockReturnValue('test-token')
    Taro.default.request.mockResolvedValue({
      statusCode: 200,
      data: { success: true },
      header: {}
    })

    await request.get('/api/v1/products/')

    const callArgs = Taro.default.request.mock.calls[0][0]
    expect(callArgs.url).toContain('/api/v1/products/')
    expect(callArgs.method).toBe('GET')
    expect(callArgs.header.Authorization).toBe('Bearer test-token')
  })

  it('401 响应应触发重新登录', async () => {
    const { request } = await import('@/utils/request')
    const Taro = await import('@tarojs/taro')

    Taro.default.getStorageSync.mockReturnValue('test-token')
    Taro.default.request.mockResolvedValue({
      statusCode: 401,
      data: { detail: 'Unauthorized' },
      header: {}
    })

    await request.get('/api/v1/products/').catch(() => {})
    expect(Taro.default.reLaunch).toHaveBeenCalled()
  })
})
```

### 5. 运行测试

```bash
# 运行所有测试
pnpm vitest run

# 监听模式（开发时）
pnpm vitest

# 运行特定文件
pnpm vitest run tests/api/products.test.js

# 生成覆盖率报告
pnpm vitest run --coverage
```

### 6. 添加到 package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 测试覆盖范围

| 测试文件 | 覆盖内容 | 优先级 |
|---------|---------|--------|
| `tests/api/products.test.js` | 商品列表/详情 API | ⭐⭐⭐ |
| `tests/api/orders.test.js` | 创建订单/支付/取消 | ⭐⭐⭐ |
| `tests/api/user-addresses.test.js` | 地址 CRUD | ⭐⭐⭐ |
| `tests/api/auth.test.js` | 微信登录/手机号 | ⭐⭐⭐ |
| `tests/api/cart.test.js` | 购物车 API | ⭐⭐ |
| `tests/utils/normalizers.test.js` | 数据转换函数 | ⭐⭐⭐ |
| `tests/utils/request.test.js` | 请求工具核心逻辑 | ⭐⭐ |

## 测试原则

1. **不依赖小程序运行时** - 所有测试在 Node.js 环境运行
2. **Mock Taro API** - 使用 vi.mock 模拟 Taro.request 等
3. **测试真实 API 函数** - 直接 import `src/api/*.js` 中的函数
4. **验证请求参数** - 确保发送给后端的参数格式正确
5. **验证响应处理** - 确保后端返回的数据被正确处理
6. **测试边界情况** - 空数据、错误响应、异常输入

## 与现有工作流集成

```
开发流程：
1. 修改 API 函数 → 2. 运行测试验证 → 3. 提交代码

CI/CD 流程：
1. 代码推送 → 2. 自动运行测试 → 3. 测试通过后构建
```

这样你可以在不打开小程序、不点击页面的情况下，快速验证 API 层的正确性。每次修改 API 函数或数据转换逻辑后，只需运行 `pnpm test` 即可确认所有逻辑正确。
