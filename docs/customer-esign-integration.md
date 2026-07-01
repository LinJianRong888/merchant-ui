# Customer e签宝对接增量文档

本文只描述 2026-07-01 新增的 customer/merchant 签署能力。未在本文标记为 `NEW` 的既有 customer 字段和接口保持原有语义。

## NEW 2026-07-01: CustomerProfile 新增字段

`GET /api/v1/users/me/` 在当前用户 `user_type == "customer"` 时，`profile` 中新增以下字段：

| 字段 | 类型 | 默认值 | NEW | 说明 |
|------|------|--------|-----|------|
| `profile.esign_verified` | boolean | `false` | NEW 2026-07-01 | 商户 e签宝实名认证/签署完成确认状态 |
| `profile.esign_cooperation_signed` | boolean | `false` | NEW 2026-07-01 | 商户合作协议是否已完成签署 |

示例响应片段：

```json
{
  "id": 12,
  "username": "merchant-user",
  "user_type": "customer",
  "profile": {
    "id": 8,
    "profile_type": "customer",
    "created_at": "2026-07-01T10:00:00+08:00",
    "updated_at": "2026-07-01T10:00:00+08:00",
    "phone": "13800000001",
    "address": "广州市天河区",
    "company": "示例商户",
    "esign_verified": false,
    "esign_cooperation_signed": false
  }
}
```

前端类型增量建议：

```ts
interface CustomerProfile {
  id: number;
  profile_type: "customer";
  created_at: string;
  updated_at: string;
  phone: string;
  address: string;
  company: string;

  // NEW 2026-07-01
  esign_verified: boolean;
  esign_cooperation_signed: boolean;
}
```

## NEW 2026-07-01: 商户合作协议签署接口

商户签署走独立通道：`merchant_cooperation`。它和业务员签署的 `agent_cooperation` 使用不同的流程模板配置、不同的签署记录查询范围、不同的 profile 状态字段，不会混用业务员的模板或签署状态。

### `POST /api/v1/esign/merchant-cooperation/start/`

- NEW 2026-07-01
- 用途：当前 customer 发起商户合作协议签署
- 认证：JWT Bearer token
- 权限：仅 `user_type == "customer"`
- 前端行为：拿到 `sign_url` 后跳转或打开 e签宝页面

请求体全部可选。正常情况下前端可以不传，后端会从当前 customer profile 取姓名/手机号/地址/公司等已有值；如页面上有更准确的覆盖值，可传 `fill_values`。

```json
{
  "fill_values": {
    "customer_name": "张三",
    "customer_phone": "13800000001"
  }
}
```

新建签署任务响应：

```json
{
  "signflow_id": "sf_merchant_001",
  "sign_url": "https://esign.cn/sign/merchant",
  "status": "pending"
}
```

已有进行中任务时，接口返回 `200 OK`，响应仍包含 `signflow_id`、`sign_url`、`status`，前端可继续跳转。

已经完成商户合作协议签署时，接口返回 `200 OK`：

```json
{
  "detail": "已完成合作协议签署，无需重复发起"
}
```

### `GET /api/v1/esign/merchant-cooperation/status/`

- NEW 2026-07-01
- 用途：查询当前 customer 的商户合作协议签署状态
- 认证：JWT Bearer token
- 权限：authenticated users
- 前端行为：用于展示签署卡片、判断是否需要签署或重新签署

无签署记录响应：

```json
{
  "has_signed": false,
  "can_do_business": false,
  "needs_resign": false,
  "esign_verified": false,
  "esign_cooperation_signed": false
}
```

有签署记录响应：

```json
{
  "has_signed": true,
  "signflow_id": "sf_merchant_001",
  "status": "completed",
  "status_label": "签署完成",
  "created_at": "2026-07-01T10:00:00+08:00",
  "completed_at": "2026-07-01T10:05:00+08:00",
  "signed_file_url": null,
  "signed_identity": {
    "psn_id": "xxx",
    "psn_name": "张三",
    "psn_mobile": "13800000001"
  },
  "can_do_business": true,
  "needs_resign": false,
  "esign_verified": true,
  "esign_cooperation_signed": true
}
```

字段说明：

| 字段 | 类型 | NEW | 说明 |
|------|------|-----|------|
| `has_signed` | boolean | NEW 2026-07-01 | 是否已有签署记录，不代表一定已完成 |
| `signflow_id` | string/null | NEW 2026-07-01 | e签宝签署流程 ID；无记录时不返回 |
| `status` | string/null | NEW 2026-07-01 | 本地签署任务状态；无记录时不返回 |
| `status_label` | string/null | NEW 2026-07-01 | 状态中文文案；无记录时不返回 |
| `created_at` | string/null | NEW 2026-07-01 | 本地签署任务创建时间 |
| `completed_at` | string/null | NEW 2026-07-01 | 签署完成时间 |
| `signed_file_url` | string/null | NEW 2026-07-01 | 已签 PDF 临时下载地址；没有或过期时为 null |
| `signed_identity` | object/null | NEW 2026-07-01 | 签署人非敏感身份快照，当前只保留 `psn_id`、`psn_name`、`psn_mobile` 中可取得的字段 |
| `can_do_business` | boolean | NEW 2026-07-01 | 当前商户是否满足签署准入，等价于 `esign_verified && esign_cooperation_signed` |
| `needs_resign` | boolean | NEW 2026-07-01 | 已有终态签署记录，但当前未满足准入，通常表示 admin 重置后需要重新签署 |
| `esign_verified` | boolean | NEW 2026-07-01 | 当前 CustomerProfile 的 e签宝认证状态 |
| `esign_cooperation_signed` | boolean | NEW 2026-07-01 | 当前 CustomerProfile 的合作协议签署状态 |

### `POST /api/v1/esign/merchant-cooperation/cancel/`

- NEW 2026-07-01
- 用途：取消当前 customer 的进行中商户合作协议签署
- 认证：JWT Bearer token
- 权限：仅 `user_type == "customer"`

取消成功：

```json
{
  "detail": "签署流程已取消",
  "signflow_id": "sf_merchant_001"
}
```

没有可取消任务：

```json
{
  "detail": "没有进行中的签署流程可取消"
}
```

## 前端接入建议

1. 登录后继续调用既有 `GET /api/v1/users/me/`。
2. 如果 `user_type == "customer"`，读取 `profile.esign_verified` 和 `profile.esign_cooperation_signed` 作为页面上的粗粒度状态。
3. 需要展示签署入口或签署详情时，调用 `GET /api/v1/esign/merchant-cooperation/status/`。
4. 如果 `can_do_business == false`，展示“签署合作协议”或“重新签署”按钮。
5. 点击按钮后调用 `POST /api/v1/esign/merchant-cooperation/start/`。
6. 如果响应包含 `sign_url`，前端跳转到该 URL。
7. 从 e签宝返回页面后，或页面重新获得焦点时，再调用 status 接口刷新状态。

## 和业务员签署通道的区别

| 项 | 业务员 | 商户/customer |
|----|--------|---------------|
| API 前缀 | `/api/v1/esign/agent-cooperation/` | `/api/v1/esign/merchant-cooperation/` |
| 用户类型 | `agent` | `customer` |
| 业务场景 | `agent_cooperation` | `merchant_cooperation` |
| 状态字段位置 | `AgentProfile.esign_*` | `CustomerProfile.esign_*` |
| 流程模板 | 独立配置 | 独立配置 |

前端不要用 agent 接口发起 customer 签署，也不要用 customer 接口发起 agent 签署。

## 错误处理

| HTTP 状态 | 场景 | 前端建议 |
|-----------|------|----------|
| 401 | 未登录或 token 失效 | 重新登录 |
| 403 | 用户类型不匹配，例如非 customer 调 merchant 接口 | 回到对应角色入口或提示无权限 |
| 400 | 后台流程模板配置缺失或不完整 | 提示稍后重试，并通知运营检查 e签宝模板配置 |
| 503 | e签宝服务临时不可用或撤销失败 | 提示稍后重试 |

## Admin 相关说明

- NEW 2026-07-01: `CustomerProfile` admin 已可查看 `esign_verified`、`esign_cooperation_signed`。
- NEW 2026-07-01: `CustomerProfile` admin 支持重置 e签宝状态；重置后前端 status 会出现 `needs_resign=true`，用于引导商户重新签署。
- 商户流程模板应在 e签宝流程模板 admin 中使用 `merchant_cooperation` 业务场景配置，不要复用 `agent_cooperation`。
