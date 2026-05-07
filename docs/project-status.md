# merchant-ui 项目状态说明

更新日期：2026-04-20

## 1. 项目当前定位

- 本项目是基于 Taro 4 + Vue 3 + Vite + JavaScript 的全新商户端小程序基座。
- 项目目录位于 `D:\coding\merchant-ui`。
- 当前选择的是 JavaScript，不再使用 TypeScript。
- 本项目用于替代旧项目 `user-front`，目的是避开此前从 React 生态迁移到 Vue 生态后造成的异常渲染和底层编译问题。

## 2. 已完成工作

### 2.1 基座重建

- 已通过 Taro 4 CLI 重新创建全新项目 `merchant-ui`。
- 已选择 Vue 3、Sass、Vite、pnpm。
- 已安装依赖，并将依赖版本基本对齐到旧项目当前基线。

### 2.2 配置对齐

- 已对齐 Taro 配置、构建脚本、微信开发者工具配置。
- 已保留 `@` 到 `src` 的别名。
- 已启用 Pinia。
- 已使用本地 composable 接管页面级请求状态。

### 2.3 文档迁移

- 已复制微信小程序 API 文档。
- 已将文档中的项目定位切换为 `merchant-ui`。
- 已将文档示例中的 `app_slug` 调整为 `merchant-miniapp`。

### 2.4 请求层迁移

- 已迁移基础请求封装到 `src/utils/request.js`。
- 默认 API 基础地址为 `process.env.TARO_APP_API_URL || 'http://127.0.0.1:8000'`。
- 请求默认自动附带 `Authorization: Bearer <access_token>`。
- 当接口返回 401 时，会清理：
  - `access_token`
  - `refresh_token`
  - `auth_session`

### 2.5 新鉴权模式接入

- 旧的 `/api/v1/auth/*` 已视为 deprecated，并已从新项目中移除。
- 当前新项目已接入文档中的微信小程序鉴权模式。
- 当前代码使用的接口为：
  - `POST /api/v1/wx/miniapp/login/`
  - `POST /api/v1/wx/miniapp/user-info/`
  - `POST /api/v1/wx/miniapp/phone-number/`
- 当前项目固定使用的 `app_slug` 为：`merchant-miniapp`
- API 调用已集中放在 `src/api/miniapp-auth.js`，便于后续单独编写测试。

### 2.6 用户地址管理功能

新增功能模块完整实现：

**API 层：**
- 已实现 `src/api/user-addresses.js`
  - `listUserAddresses()` - 获取用户所有地址
  - `getUserAddress(addressId)` - 获取单个地址详情
  - `createUserAddress(addressData)` - 新增地址
  - `updateUserAddress(addressId, addressData)` - 编辑地址
  - `deleteUserAddress(addressId)` - 删除地址

**UI 页面：**
1. **地址管理列表页** - `src/pages/user/addresses/index`
   - 展示用户所有地址列表
   - 支持编辑、删除、新增地址
   - 加载、错误、空状态处理
   - 下拉刷新功能

2. **地址编辑表单页** - `src/pages/user/addresses/edit/index`
   - 完整的地址编辑表单
   - 字段：收货人、手机号、省份、城市、区县、详细地址、邮编
   - 支持新增和编辑两种模式
   - 表单验证和错误提示
   - 默认地址设置

3. **订单地址选择页** - `src/pages/orders/address-select/index`
   - 下单时展示用户地址列表供选择
   - 快速新增地址入口
   - 集成完整支付流程（创建订单 → 拉起支付 → 轮询确认）
   - 导航回订单列表

**下单流程优化：**
- 修改商品详情页：点击"立即下单" → 直接导航到地址选择页
- 移除硬编码的测试地址
- 用户必须选择实际地址进行下单
- 完整的订单创建和支付流程集成

**文件结构：**
```
src/api/user-addresses.js
src/pages/user/addresses/
  ├── index.vue / index.config.js / index.scss
  └── edit/
      ├── index.vue / index.config.js / index.scss
src/pages/orders/address-select/
  ├── index.vue / index.config.js / index.scss
```

## 3. 当前状态管理设计

当前状态管理分为两层：

### 3.1 Pinia

目前存在一个认证 store：`src/stores/auth.js`

用途：

- 保存认证会话状态
- 在应用启动时从本地缓存恢复会话
- 提供纯状态更新与会话清理能力

当前 store 中保存的字段包括：

- `appSlug`
- `accessToken`
- `refreshToken`
- `userId`
- `identityId`
- `openid`
- `isNewUser`
- `phoneNumber`
- `purePhoneNumber`
- `countryCode`

当前 getters：

- `isAuthenticated`
- `hasWechatIdentity`

当前 actions：

- `hydrate()`
- `setSession(payload)`
- `setWechatUserInfo(payload)`
- `setPhoneNumber(payload)`
- `clearSession()`

### 3.2 页面请求状态

页面级请求状态由 `src/utils/app-query.js` 统一管理。

当前能力包括：

- `useAppQuery()`：提供 `data / isLoading / isFetching / isError / error / refetch`
- `useAppMutation()`：提供 `mutate / mutateAsync / isPending`
- 轻量内存缓存与手动失效能力

不再依赖 `@tanstack/vue-query`，以避免小程序页面环境下的 observer 失效问题。

## 4. 关于精简会话字段的说明

目前前端已移除以下无业务依赖字段：

- `unionid`
- `sessionKey`

原因：

- 当前商户端前后端流程都不使用这两个字段
- 保留它们只会增加 store、持久化结构和后续测试复杂度
- 当前会话状态只保留真正参与前端逻辑的字段

## 5. 首页与业务代码状态

- 首页未迁移。
- 用户已明确表示首页将重新制作。
- 当前新项目只保留了可正常编译的默认首页。
- 请求封装、独立 API 层、认证 store 已经准备好，可直接给新首页接入。

## 6. 已验证结果

已执行并通过：

```bash
pnpm install
pnpm build:weapp
```

说明：

- 当前新项目可以成功编译为微信小程序。
- 当前请求层、独立 API 层、认证 store 和新鉴权模式不会导致构建失败。

## 7. 当前关键文件

- `src/utils/request.js`：基础请求封装
- `src/api/miniapp-auth.js`：微信小程序鉴权 API 层
- `src/api/user-addresses.js`：用户地址管理 API 层
- `src/stores/auth.js`：纯状态管理的认证 store
- `src/app.js`：Pinia 初始化入口
- `src/utils/app-query.js`：页面请求状态封装
- `src/pages/user/addresses/index.vue`：地址管理列表页
- `src/pages/user/addresses/edit/index.vue`：地址编辑表单页
- `src/pages/orders/address-select/index.vue`：订单地址选择页
- `docs/wechat-miniapp-api.md`：微信小程序接口文档
- `docs/user-addresses.md`：用户地址 API 文档
- `docs/address-management-flow.md`：地址管理与订单流程完整文档（新增）

## 8. 下次继续开发前建议先确认的事项

1. ~~后端 `/api/v1/wx/miniapp/user-info/` 的实际返回字段是否稳定包含 `identity_id`。~~
   - **已确认**：已接入新鉴权模式
   
2. 新首页要先接入哪条链路：
   - 只做 `wx.login()` 登录
   - 登录后立即拉 `user-info`
   - 登录后再接手机号授权
   
3. 是否需要将页面侧调用继续整理成 composable，例如 `useMiniappAuth()`。

4. **地址管理功能已完成**
   - 用户地址 CRUD 操作已全部实现
   - 下单流程已集成地址选择
   - 建议后续测试：
     - 新增、编辑、删除地址功能
     - 下单时的地址选择和支付流程
     - 各类异常场景处理（网络错误、表单验证等）

## 9. 已验证构建结果

- 2026-04-20：添加地址管理和选择功能后构建成功
  ```bash
  ✓ 186 modules transformed
  ✓ built in 9.46s
  ```
- 所有新页面（地址编辑、地址选择）已正常编译
- 未产生任何构建错误或警告

## 9. 当前结论

新项目已经具备继续开发的前提条件：

- 干净的 Taro 4 + Vue 3 JavaScript 基座已建立
- 微信小程序新鉴权模式已接入
- 商户端 `app_slug` 已固定为 `merchant-miniapp`
- API 调用与状态管理职责已拆分清楚
- 文档与代码主方向已基本一致