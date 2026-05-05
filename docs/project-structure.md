# merchant-ui 项目结构说明

> 更新日期：2026-05-05

## 一、项目概览

本项目是一个基于 **Taro 4 + Vue 3 + JavaScript** 的微信小程序商户端应用，主要用于商品展示、购物车、订单管理和用户中心等功能。

> ⚠️ **重要说明**：本项目使用纯 JavaScript，不使用 TypeScript。

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Taro | 4.1.11 | 跨端小程序框架 |
| Vue | 3.5.30 | 前端 UI 框架 |
| NutUI Taro | 4.3.14 | UI 组件库（已安装但当前页面未使用） |
| Pinia | 3.0.4 | 状态管理（认证、购物车） |
| @tanstack/vue-query | 5.90.3 | 服务端状态管理（已初始化但**未实际使用**） |
| Sass | 1.75.0 | CSS 预处理器 |
| Vite | 4.2.0 | 构建工具（Taro 编译模式） |
| pnpm | - | 包管理器 |

### 构建命令

```bash
# 开发模式（微信小程序）
pnpm dev:weapp

# 生产构建（微信小程序）
pnpm build:weapp

# 其他平台
pnpm build:h5      # H5
pnpm build:alipay  # 支付宝小程序
pnpm build:swan    # 百度小程序
```

---

## 二、目录结构

```
merchant-ui/
├── config/                    # Taro 构建配置
│   ├── index.js               # 主配置（别名、编译选项、postcss 等）
│   ├── dev.js                 # 开发环境配置
│   └── prod.js                # 生产环境配置
│
├── src/                       # 源代码
│   ├── app.config.js          # 小程序全局配置（页面路由、tabBar）
│   ├── app.js                 # 应用入口（Pinia、VueQuery 初始化）
│   ├── app.scss               # 全局样式
│   ├── index.html             # H5 入口 HTML
│   │
│   ├── api/                   # API 请求层（与后端接口一一对应）
│   │   ├── cart.js            # 购物车 API（本地存储实现）
│   │   ├── miniapp-auth.js    # 微信小程序鉴权 API
│   │   ├── orders.js          # 订单 API
│   │   ├── products.js        # 商品 API
│   │   └── user-addresses.js  # 用户地址 API
│   │
│   ├── assets/                # 静态资源（图片、图标）
│   │
│   ├── components/            # 公共组件
│   │   └── LocationCascader.vue  # 省市区三级联动选择器
│   │
│   ├── data/                  # 静态数据
│   │   └── pcaa.js            # 中国省市区行政编码数据
│   │
│   ├── pages/                 # 页面
│   │   ├── index/             # 登录页（微信一键登录）
│   │   ├── home/              # 首页（商品搜索、轮播、热卖）
│   │   ├── products/          # 商品列表页
│   │   │   └── detail/        # 商品详情页
│   │   ├── cart/              # 购物车页
│   │   ├── orders/            # 订单列表页
│   │   │   ├── detail/        # 订单详情页
│   │   │   └── address-select/# 下单地址选择页
│   │   └── user/              # 个人中心页
│   │       └── addresses/     # 地址管理
│   │           └── edit/      # 地址编辑页
│   │
│   ├── stores/                # Pinia 状态管理
│   │   ├── auth.js            # 认证状态（登录会话、token）
│   │   └── cart.js            # 购物车状态
│   │
│   └── utils/                 # 工具函数
│       ├── request.js         # HTTP 请求封装（自动鉴权、401 处理）
│       └── location.js        # 地址编码转换工具
│
├── docs/                      # 项目文档
│   ├── project-structure.md   # 本文件 - 项目结构说明
│   ├── project-status.md      # 项目状态与开发记录
│   ├── wechat-miniapp-api.md  # 微信小程序接口文档
│   ├── user-addresses.md      # 用户地址 API 文档
│   ├── address-management-flow.md  # 地址管理与订单流程
│   ├── orders.md              # 订单相关文档
│   ├── products.md            # 商品相关文档
│   ├── users.md               # 用户相关文档
│   ├── wechat.md              # 微信相关文档
│   └── wxpay.md               # 微信支付文档
│
├── .env.development           # 开发环境变量
├── .env.production            # 生产环境变量
├── .env.test                  # 测试环境变量
├── package.json               # 项目依赖与脚本
├── project.config.json        # 微信开发者工具配置
└── babel.config.js            # Babel 配置
```

---

## 三、页面路由与导航

### 页面列表

| 路由路径 | 页面名称 | TabBar | 说明 |
|----------|----------|--------|------|
| `pages/index/index` | 登录页 | ❌ | 微信一键登录入口 |
| `pages/home/index` | 首页 | ✅ | 商品搜索、轮播图、热卖商品 |
| `pages/products/index` | 商品列表 | ✅ | 所有可售商品列表 |
| `pages/products/detail/index` | 商品详情 | ❌ | 商品详情、加入购物车、立即购买 |
| `pages/cart/index` | 购物车 | ✅ | 购物车管理、结算 |
| `pages/orders/index` | 订单列表 | ❌ | 按状态筛选订单 |
| `pages/orders/detail/index` | 订单详情 | ❌ | 订单信息、支付、取消 |
| `pages/orders/address-select/index` | 下单确认 | ❌ | 选择地址、提交订单、支付 |
| `pages/user/index` | 个人中心 | ✅ | 用户信息、订单入口、地址管理 |
| `pages/user/addresses/index` | 地址管理 | ❌ | 地址列表、增删改 |
| `pages/user/addresses/edit/index` | 地址编辑 | ❌ | 新增/编辑地址表单 |

### TabBar 配置

底部导航栏共 4 个 Tab：
1. **首页** (`pages/home/index`) - 首页图标
2. **商品** (`pages/products/index`) - 商品图标
3. **购物车** (`pages/cart/index`) - 购物车图标
4. **我的** (`pages/user/index`) - 用户图标

选中颜色：`#ffcc00`，未选中颜色：`#999`

---

## 四、核心模块详解

### 4.1 请求层 (`src/utils/request.js`) — 核心请求封装

> 本项目**没有使用 `@tanstack/vue-query` 来发送请求**，所有 HTTP 请求都通过自定义封装的 `request` 工具发出。
>
> 💡 **关于 Vue Query 与 Taro.request 的兼容性说明**：`@tanstack/vue-query` 的 `useQuery` / `useMutation` 只负责**状态管理**（缓存、加载态、错误态、重试等），它通过 `queryFn` 参数接受任何异步函数作为请求源。因此完全可以这样结合使用：
> ```javascript
> // ✅ 完全可行 — queryFn 内使用 Taro.request 或封装的 request 工具
> const { data, isLoading } = useQuery({
>   queryKey: ['products'],
>   queryFn: () => request.get('/api/v1/products/', { data: { mode: 'sale' } })
> })
> ```
> 这样既保留了 Taro 的跨端能力，又享受了 Vue Query 的缓存/重试/状态管理优势。当前项目只是尚未接入，并非不能结合。

#### 设计思路

`src/utils/request.js` 是一个基于 `Taro.request` 的轻量级请求封装，提供了统一的请求入口、自动鉴权、错误处理和 401 未授权拦截。

#### 核心函数：`baseRequest(options)`

```javascript
async function baseRequest(options) {
  const { url, method, data, header, skipAuth, timeout } = options
  // 1. 拼接完整 URL
  // 2. 自动附加 Authorization 请求头（除非 skipAuth=true）
  // 3. 调用 Taro.request() 发送请求
  // 4. 如果返回 401 且非 skipAuth，触发未授权处理
  // 5. 返回 { data, statusCode, header }
}
```

#### 暴露的方法

```javascript
export const request = {
  get:    (url, options) => baseRequest({ ...options, url, method: 'GET' }),
  post:   (url, data, options) => baseRequest({ ...options, url, method: 'POST', data }),
  put:    (url, data, options) => baseRequest({ ...options, url, method: 'PUT', data }),
  delete: (url, options) => baseRequest({ ...options, url, method: 'DELETE' }),
  patch:  (url, data, options) => baseRequest({ ...options, url, method: 'PATCH', data })
}
```

#### 鉴权机制

1. **自动附加 Token**：每次请求（除登录外）自动从 `Taro.getStorageSync('access_token')` 读取 token，附加到 `Authorization: Bearer <token>` 请求头。
2. **登录接口跳过鉴权**：`miniapp-auth.js` 中的登录接口调用时传入 `skipAuth: true`，避免在未登录时发送无效的 Authorization 头。

#### 鉴权失败 / JWT 过期处理

当后端返回 `401` 状态码时，`baseRequest` 内部会调用 `handleUnauthorizedResponse()`：

```javascript
function handleUnauthorizedResponse() {
  if (isHandlingUnauthorized) return  // 防止重复处理

  isHandlingUnauthorized = true
  clearAuthStorage()  // 清除 access_token、refresh_token、auth_session

  const currentRoute = getCurrentRoute()

  if (currentRoute === LOGIN_PAGE_PATH) {
    // 如果已经在登录页，不重复跳转
    isHandlingUnauthorized = false
    return
  }

  // 跳转到登录页
  void Taro.reLaunch({ url: LOGIN_PAGE_PATH })
}
```

**处理流程总结：**
```
后端返回 401
  → clearAuthStorage() 清除本地存储的 token 和会话
  → 检查当前是否已在登录页（避免死循环）
  → 不在登录页 → Taro.reLaunch() 强制跳转登录页
  → 已在登录页 → 不做任何操作
```

> ⚠️ **注意**：当前实现是**直接清除 token 并跳转登录页**，没有实现 token 自动刷新（refresh token）机制。如果 refresh_token 过期，用户需要重新登录。

#### 错误处理

请求层将 `Taro.request` 的底层错误（网络超时、断网等）包装为 `RequestError` 对象抛出，包含 `request` 元信息（url、method、timeout、data），方便上层 API 层捕获并展示错误信息。

### 4.2 API 层 (`src/api/`) — 业务请求封装

每个 API 文件对应一个后端资源，职责单一。它们统一使用 `src/utils/request.js` 导出的 `request` 对象发送 HTTP 请求，**不直接使用 `Taro.request`**。

#### 文件清单

| 文件 | 职责 | 鉴权方式 |
|------|------|----------|
| **`miniapp-auth.js`** | 微信小程序鉴权（登录、获取用户信息、获取手机号） | 登录接口 `skipAuth: true`，其余自动鉴权 |
| **`products.js`** | 商品列表与详情（`mode=sale` 销售模式） | 自动鉴权 |
| **`cart.js`** | 购物车（**基于 `Taro.setStorageSync` 本地存储实现，不涉及 HTTP 请求**） | 无 |
| **`orders.js`** | 订单 CRUD、支付、取消 | 自动鉴权 |
| **`user-addresses.js`** | 用户地址 CRUD | 自动鉴权 |

#### 通用模式：`ensureSuccessResponse()`

除购物车外，所有 API 文件都包含一个 `ensureSuccessResponse()` 辅助函数，用于统一处理 HTTP 响应状态码：

```javascript
function ensureSuccessResponse(response, fallbackMessage, requestMeta) {
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data  // 成功 → 直接返回数据
  }
  // 失败 → 构造包含详细信息的 Error 对象并抛出
  const error = new Error(extractErrorMessage(response, fallbackMessage))
  error.statusCode = response.statusCode
  error.response = response
  error.request = requestMeta
  throw error
}
```

#### 购物车特殊说明

`src/api/cart.js` 是一个**纯本地存储实现**，所有数据读写都通过 `Taro.setStorageSync('cart_items', ...)` 完成，不涉及任何 HTTP 请求。这意味着：
- 购物车数据仅保存在当前设备本地
- 切换设备或清除小程序缓存会丢失购物车数据
- 购物车操作不会触发 401 鉴权失败处理

### 4.3 状态管理

#### Pinia Stores

**`stores/auth.js`** - 认证状态
- 状态：`accessToken`, `refreshToken`, `userId`, `openid`, `phoneNumber` 等
- 持久化：通过 `Taro.setStorageSync` 存储到本地
- 初始化：`hydrate()` 从本地恢复会话
- 登录：`setSession()` 设置登录态
- 登出：`clearSession()` 清除所有状态

**`stores/cart.js`** - 购物车状态
- 状态：`items`, `totalCount`, `isInitialized`
- 所有操作（增删改查）都通过 API 层操作本地存储
- 提供 `addToCart`, `updateQuantity`, `removeItem`, `clear`, `clearSelected` 等方法

#### Vue Query

- 已在 `app.js` 中初始化 `QueryClient` 并注册 `VueQueryPlugin`
- 当前**未实际使用**，仅为后续服务端状态缓存做准备

### 4.4 公共组件

**`components/LocationCascader.vue`** - 省市区三级联动选择器
- 基于 Taro 原生 `picker` 组件实现
- 使用 `v-model` 双向绑定
- 数据源：`data/pcaa.js`（中国省市区行政编码数据）
- 支持 `disabled` 属性

### 4.5 工具函数

**`utils/location.js`** - 地址编码转换
- `addressNamesToCodes()` - 将地址名称转为行政编码（用于表单提交）
- `addressCodesToNames()` - 将行政编码转为名称（用于显示）

---

## 五、数据流与业务逻辑

### 5.1 登录流程

```
用户打开小程序
  → 首页/商品页检查 authStore.isAuthenticated
  → 未登录 → 跳转登录页 (pages/index/index)
  → 点击"微信一键登录"
  → Taro.login() 获取 code
  → POST /api/v1/wx/miniapp/login/ 换取 token
  → authStore.setSession() 保存登录态
  → 跳转商品列表页
```

### 5.2 下单流程

```
商品详情页点击"立即购买"
  → 跳转 address-select 页（携带 productId, quantity）
  → 加载用户地址列表
  → 用户选择地址
  → 点击"提交订单"
  → POST /api/v1/orders/ 创建订单
  → POST /api/v1/orders/{id}/pay/ 获取支付参数
  → Taro.requestPayment() 拉起微信支付
  → 轮询订单状态确认支付结果
  → 跳转订单列表页
```

### 5.3 购物车流程

```
购物车页
  → 从本地存储加载购物车数据
  → 选择商品 → 点击"结算"
  → 跳转 address-select 页（携带 selectedIds）
  → 后续流程同下单流程（多商品模式）
```

---

## 六、环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `TARO_APP_API_URL` | 后端 API 基础地址 | `http://127.0.0.1:8000` |

- 开发环境 (`.env.development`)：`https://www.gzy888.site`
- 生产环境 (`.env.production`)：`https://www.gzy888.site`
- 测试环境 (`.env.test`)：未设置

---

## 七、后端 API 接口

所有接口前缀：`{TARO_APP_API_URL}/api/v1/`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/wx/miniapp/login/` | 微信小程序登录 |
| POST | `/wx/miniapp/user-info/` | 获取微信用户信息 |
| POST | `/wx/miniapp/phone-number/` | 获取微信手机号 |
| GET | `/products/` | 商品列表（`?mode=sale`） |
| GET | `/products/{id}/` | 商品详情（`?mode=sale`） |
| GET | `/orders/` | 订单列表 |
| POST | `/orders/` | 创建订单 |
| GET | `/orders/{id}/` | 订单详情 |
| POST | `/orders/{id}/pay/` | 创建支付参数 |
| POST | `/orders/{id}/cancel/` | 取消订单 |
| GET | `/user-addresses/` | 地址列表 |
| POST | `/user-addresses/` | 新增地址 |
| GET | `/user-addresses/{id}/` | 地址详情 |
| PATCH | `/user-addresses/{id}/` | 更新地址 |
| DELETE | `/user-addresses/{id}/` | 删除地址 |

---

## 八、注意事项

1. **购物车使用本地存储**：购物车数据存储在 `Taro.setStorageSync('cart_items', ...)`，非服务端存储，切换设备会丢失。
2. **NutUI 已安装但未使用**：`@nutui/nutui-taro` 在 `package.json` 中作为依赖，但当前页面均使用 Taro 原生组件，未使用 NutUI 组件。
3. **Vue Query 已初始化但未使用**：`@tanstack/vue-query` 已注册但未接入具体业务查询。
4. **无 TypeScript**：项目使用纯 JavaScript，无 TypeScript 配置。
5. **app_slug 固定值**：微信小程序鉴权的 `app_slug` 固定为 `merchant-miniapp`。
6. **页面样式独立**：每个页面有自己的 `index.scss`，通过 `import './index.scss'` 引入。
