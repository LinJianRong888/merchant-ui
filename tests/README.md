# 测试说明

## 当前测试策略

当前测试使用 **Vitest + Mock** 模式，不实际发出网络请求。

```
测试文件 → import 真实 API 函数 → 调用时 mock 掉 request 工具 → 验证参数和逻辑
```

所有测试在 Node.js 环境运行，不依赖小程序运行时，毫秒级完成。

## 运行测试

```bash
pnpm test          # 运行所有测试
pnpm test:watch    # 监听模式
pnpm test:coverage # 覆盖率报告
pnpm test tests/api/orders.test.js  # 运行单个文件
```

## 当前测试文件

| 文件 | 用例数 | 覆盖内容 |
|------|--------|----------|
| `tests/api/products.test.js` | 5 | 商品列表(sale mode/空数据/错误)、商品详情 |
| `tests/api/orders.test.js` | 10 | 创建订单(单商品/多商品/参数校验/错误)、支付参数、详情、列表、取消 |
| `tests/api/user-addresses.test.js` | 6 | 地址 CRUD(列表/详情/创建/更新/删除/错误) |

## 测试原理

```javascript
// 1. setup.js 全局 mock 了 @tarojs/taro 和 @/utils/request
vi.mock('@tarojs/taro')      // Taro.request → vi.fn() 不实际发请求
vi.mock('@/utils/request')   // request.get/post → vi.fn() 可手动控制返回值

// 2. 测试用例 import 真实的 API 函数
import { listOrders } from '@/api/orders'

// 3. 手动控制 mock 返回值，验证函数行为
request.get.mockResolvedValue({ statusCode: 200, data: [...] })
const result = await listOrders()
expect(request.get).toHaveBeenCalledWith('/api/v1/orders/')
```

## 未来集成测试

当有测试环境的 `access_token` 后，可按以下步骤接入真实 API 集成测试：

1. 创建 `tests/integration/` 目录
2. 使用 Node.js 原生 `fetch()`（Node 18+）替代 mock
3. 在 `tests/setup.js` 中添加环境变量读取 token
4. 参考 `docs/api-testing.md` 中的集成测试方案

可测试的真实接口（不需要微信环境）：

| 接口 | 需要 Token | 说明 |
|------|-----------|------|
| GET /api/v1/products/ | ✅ | 商品列表 |
| GET /api/v1/products/{id}/ | ✅ | 商品详情 |
| GET /api/v1/orders/ | ✅ | 订单列表 |
| POST /api/v1/orders/ | ✅ | 创建订单 |
| GET /api/v1/orders/{id}/ | ✅ | 订单详情 |
| POST /api/v1/orders/{id}/cancel/ | ✅ | 取消订单 |
| GET /api/v1/user-addresses/ | ✅ | 地址列表 |
| POST /api/v1/user-addresses/ | ✅ | 新增地址 |
| PATCH /api/v1/user-addresses/{id}/ | ✅ | 更新地址 |
| DELETE /api/v1/user-addresses/{id}/ | ✅ | 删除地址 |
