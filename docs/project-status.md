# merchant-ui 项目状态说明

更新日期：2026-04-12

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
- 已启用 `@tanstack/vue-query`。

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

### 3.2 Vue Query

`@tanstack/vue-query` 已在应用入口初始化，但当前尚未接入具体业务查询。

当前只是为后续服务端状态缓存做准备。

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
- `src/stores/auth.js`：纯状态管理的认证 store
- `src/app.js`：Pinia 与 Vue Query 初始化入口
- `docs/wechat-miniapp-api.md`：当前参考的接口文档

## 8. 下次继续开发前建议先确认的事项

1. 后端 `/api/v1/wx/miniapp/user-info/` 的实际返回字段是否稳定包含 `identity_id`。
2. 新首页要先接入哪条链路：
   - 只做 `wx.login()` 登录
   - 登录后立即拉 `user-info`
   - 登录后再接手机号授权
3. 是否需要将页面侧调用继续整理成 composable，例如 `useMiniappAuth()`。

## 9. 当前结论

新项目已经具备继续开发的前提条件：

- 干净的 Taro 4 + Vue 3 JavaScript 基座已建立
- 微信小程序新鉴权模式已接入
- 商户端 `app_slug` 已固定为 `merchant-miniapp`
- API 调用与状态管理职责已拆分清楚
- 文档与代码主方向已基本一致