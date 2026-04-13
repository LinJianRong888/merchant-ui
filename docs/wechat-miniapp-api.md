# 微信小程序 API 对接说明

## 适用范围

本文件用于前端 `merchant-ui` 项目对接后端微信小程序相关 API。

当前后端微信 API 统一放在：`/api/v1/wx/`

## 前置说明

- 当前所有微信小程序相关接口都需要传 `app_slug`
- 现有可用小程序：
  - `biz-miniapp` 对应 `业务端`
  - `merchant-miniapp` 对应 `商户端`
- `wx.login()` 返回的 `code` 是一次性的，不能重复使用
- `getPhoneNumber` 更适合在真机或体验版下测试

## 1. 小程序登录

### 接口

- `POST /api/v1/wx/miniapp/login/`

### 请求体

```json
{
  "app_slug": "merchant-miniapp",
  "code": "wx-login-code"
}
```

### 前端调用示例

```js
wx.login({
  success(res) {
    if (!res.code) return

    // 将 res.code 发送给后端
  }
})
```

### 成功响应示例

```json
{
  "refresh": "<refresh-token>",
  "access": "<access-token>",
  "app_slug": "merchant-miniapp",
  "identity_id": 1,
  "user_id": 1,
  "is_new_user": true,
  "openid": "openid"
}
```

## 2. 微信身份信息

### 接口

- `POST /api/v1/wx/miniapp/user-info/`

### 认证

- 需要 JWT Bearer Token

### 请求体

```json
{
  "app_slug": "merchant-miniapp",
  "openid": "openid"
}
```

### 成功响应示例

```json
{
  "app_slug": "merchant-miniapp",
  "app_id": "wx07bd64e05d44932a",
  "user_id": 1,
  "identity_id": 1,
  "openid": "openid",
  "last_login_at": "2026-04-11T09:00:00+08:00",
  "is_active": true
}
```

## 3. 获取手机号

### 接口

- `POST /api/v1/wx/miniapp/phone-number/`

### 认证

- 需要 JWT Bearer Token

### 请求体

```json
{
  "app_slug": "merchant-miniapp",
  "code": "phone-number-code"
}
```

### 成功响应示例

```json
{
  "phone_number": "+8613812345678",
  "pure_phone_number": "13812345678",
  "country_code": "86"
}
```

## 微信开发者工具测试建议

### 登录测试

1. 在开发者工具里调用 `wx.login()`
2. 将返回的 `code` 发送给 `/api/v1/wx/miniapp/login/`
3. 保存后端返回的 `access` / `refresh`
4. 后续请求在 `Authorization` 头中携带：`Bearer <access>`

### 手机号测试

1. 先完成登录
2. 调用 `getPhoneNumber`
3. 将返回的 `code` 发送给 `/api/v1/wx/miniapp/phone-number/`

## 当前可直接测试的 app_slug

- `merchant-miniapp`