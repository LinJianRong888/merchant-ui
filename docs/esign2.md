# e签宝 API

## Purpose

The `esign` module provides e-signature capabilities via e签宝 SaaS v3 API. It covers webhook callback handling and agent-facing business endpoints for cooperation agreement signing.

## Endpoints

### `POST /api/v1/esign/notify/`

- Purpose: e签宝 webhook callback entry point (public, no auth)
- Authentication: None (trust established via HMAC-SHA256 signature verification)
- Permission: AllowAny
- CSRF: Exempt

This endpoint is called by e签宝 servers to deliver asynchronous notifications (sign-flow events, auth results, etc.). The flow:

1. Verify HMAC-SHA256 signature using the account's `app_secret`
2. Persist an audit row (always — even on signature failure)
3. If signature is valid and not a duplicate, enqueue a Celery task for async processing
4. Always return HTTP 200 to e签宝

**Request headers** (set by e签宝):

| Header | Description |
|--------|-------------|
| `X-Tsign-Open-App-Id` | e签宝 AppId |
| `X-Tsign-Open-Timestamp` | Request timestamp (milliseconds) |
| `X-Tsign-Open-Signature` | HMAC-SHA256 signature |
| `X-Tsign-Open-Signature-Algorithm` | `hmac-sha256` |
| `Content-Type` | `application/json` |

**Request body** (JSON, varies by action):

```json
{
  "action": "SIGN_FLOW_COMPLETE",
  "signFlowId": "sf_001",
  "...": "..."
}
```

Common actions: `SIGN_FLOW_COMPLETE`, `SIGN_MISSON_COMPLETE`, `AUTH_PASS`, `SIGN_FLOW_EXPIRE`.

**Response** (always 200):

```json
{
  "errCode": 0,
  "errMsg": "received"
}
```

### `POST /api/v1/esign/agent-cooperation/start/`

- Purpose: Business agent initiates a cooperation agreement signing flow
- Authentication: JWT Bearer token required
- Permission: authenticated users with `user_type == 'agent'`

The view:
1. Gates on agent user type (returns 403 for non-agents)
2. Checks for an existing in-progress sign flow (returns its URL if found)
3. **Guard**: if `can_do_business` is already `true` (agent is fully qualified),
   returns 200 with a "已完成" message instead of creating a redundant flow
4. Builds fill values from the agent's profile (with optional overrides)
5. Builds signers config (agent as personal signer with e签宝 psnSignerInfo)
6. Calls `create_agent_cooperation_signflow` (service layer)
7. Gets the signing H5 URL via `get_signer_url`
8. Returns the URL for the frontend to redirect

**Note**: The agent's `esign_verified` and `esign_cooperation_signed` fields are
now returned in the `GET /api/v1/esign/agent-cooperation/status/` response,
along with `can_do_business` and `needs_resign` signals. The frontend should
use the status endpoint to determine whether the agent needs to sign or re-sign.

**Request body** (all fields optional):

```json
{
  "fill_values": {
    "agent_name": "张三",
    "agent_phone": "13800000001"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fill_values` | object | No | Optional overrides for template fill values (defaults from user profile) |

**Response** (201 Created — new sign flow):

```json
{
  "signflow_id": "sf_new_001",
  "sign_url": "https://esign.cn/sign/abc123",
  "status": "pending"
}
```

**Response** (200 OK — existing in-progress flow):

```json
{
  "signflow_id": "sf_existing_001",
  "sign_url": "https://esign.cn/sign/existing",
  "status": "pending"
}
```

**Response** (200 OK — already fully qualified, no redundant flow created):

```json
{
  "detail": "已完成合作协议签署，无需重复发起"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `signflow_id` | string | e签宝 sign flow ID |
| `sign_url` | string | Agent signing H5 URL (redirect the user here) |
| `status` | string | Current sign flow status |

**Error responses**:

| Status | Condition |
|--------|-----------|
| 401 | Unauthenticated |
| 403 | Non-agent user |
| 400 | Configuration error (e.g. no active template) |
| 503 | e签宝 service temporarily unavailable |

### `POST /api/v1/esign/agent-cooperation/cancel/`

- Purpose: Business agent cancels their in-progress cooperation agreement signing flow
- Authentication: JWT Bearer token required
- Permission: authenticated users with `user_type == 'agent'`

The view:
1. Finds the agent's latest sign flow for agent-cooperation
2. If it's in-progress, calls e签宝 revoke API (`POST /v3/sign-flow/{signFlowId}/revoke`) + marks local as `failed`
3. If no in-progress flow, returns 200 with a message

**Request body**: None required.

**Response** (200 — cancelled successfully):

```json
{
  "detail": "签署流程已取消",
  "signflow_id": "sf_cancel_001"
}
```

**Response** (200 — no in-progress flow):

```json
{
  "detail": "没有进行中的签署流程可取消"
}
```

**Error responses**:

| Status | Condition |
|--------|-----------|
| 401 | Unauthenticated |
| 403 | Non-agent user |
| 503 | e签宝 service error (revoke failed) |

### `GET /api/v1/esign/agent-cooperation/status/`

- Purpose: Business agent queries their cooperation agreement signing status
- Authentication: JWT Bearer token required
- Permission: authenticated users

**Response** (200 — no sign flow exists):

```json
{
  "has_signed": false,
  "can_do_business": false,
  "needs_resign": false,
  "esign_verified": false,
  "esign_cooperation_signed": false
}
```

**Response** (200 — sign flow exists, healthy):

```json
{
  "has_signed": true,
  "signflow_id": "sf_status_001",
  "status": "completed",
  "status_label": "签署完成",
  "created_at": "2026-06-16T10:00:00+08:00",
  "completed_at": "2026-06-16T10:05:00+08:00",
  "signed_file_url": null,
  "can_do_business": true,
  "needs_resign": false,
  "esign_verified": true,
  "esign_cooperation_signed": true
}
```

**Response** (200 — sign flow exists, admin reset → needs resign):

```json
{
  "has_signed": true,
  "signflow_id": "sf_status_001",
  "status": "completed",
  "status_label": "签署完成",
  "created_at": "2026-06-16T10:00:00+08:00",
  "completed_at": "2026-06-16T10:05:00+08:00",
  "signed_file_url": null,
  "can_do_business": false,
  "needs_resign": true,
  "esign_verified": true,
  "esign_cooperation_signed": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `has_signed` | boolean | Whether the agent has any sign flow record |
| `signflow_id` | string | e签宝 sign flow ID |
| `status` | string | Current status code |
| `status_label` | string | Human-readable status label in Chinese |
| `created_at` | datetime | When the sign flow was initiated |
| `completed_at` | datetime | When signing completed (null if not yet) |
| `signed_file_url` | string | URL to the signed PDF (null if not yet available) |
| `can_do_business` | boolean | Whether the agent can do business (requires esign_verified + esign_cooperation_signed) |
| `needs_resign` | boolean | Whether the agent needs to re-sign (has signflow record but can_do_business is false, typically after admin reset) |
| `esign_verified` | boolean | e签宝 real-name verification status |
| `esign_cooperation_signed` | boolean | Cooperation agreement signed status |

**Sign flow status values**:

| Status | Label | Description |
|--------|-------|-------------|
| `draft` | 草稿 | Created but not yet submitted to e签宝 |
| `pending` | 待签署 | Submitted, waiting for signers |
| `partially_signed` | 部分已签 | Some signers have signed |
| `completed` | 签署完成 | All signers have signed |
| `rejected` | 已拒签 | A signer rejected |
| `expired` | 已过期 | Sign flow expired |
| `failed` | 失败 | Sign flow failed |

**Error responses**:

| Status | Condition |
|--------|-----------|
| 401 | Unauthenticated |



## Agent 业务状态说明（can_do_business）

### 背景

业务员（agent）角色需要完成 e签宝实名认证 **和** 合作协议签署后，才能进行业务操作（如创建样品订单、获取邀请码）。这个状态通过统一的 `can_do_business` 函数判断。

### 哪里可以获取这个状态

`GET /api/v1/users/me/` 的响应中包含 `can_do_business` 字段：

```json
{
  "id": 9,
  "username": "林",
  "user_type": "agent",
  "is_active": true,
  "profile": {...},
  "can_do_business": false
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `can_do_business` | boolean | 业务员是否可以进行业务操作。Agent 需完成 e签宝实名认证 + 合作协议签署才为 true；非 agent 用户始终为 true |

### 判断逻辑

```python
def can_do_business(user) -> bool:
    if user.user_type != UserType.AGENT:
        return True
    profile = get_user_profile(user)
    if profile is None:
        return False
    return profile.esign_verified and profile.esign_cooperation_signed
```

### 受影响的业务操作

当 `can_do_business` 为 false 时，以下操作会被拒绝（返回 403）：

| 业务操作 | API | 错误信息 |
|---------|-----|---------|
| 创建样品订单 | `POST /api/v1/orders/` | "业务员需完成e签宝实名认证并签署合作协议后才能执行此操作" |
| 获取邀请码 | `GET /api/v1/invitations/agent-code/` | 同上 |

### 前端集成建议

1. 业务员登录后，通过 `GET /api/v1/users/me/` 检查 `can_do_business`
2. 如果为 false，调 `GET /api/v1/esign/agent-cooperation/status/` 获取详细状态
3. 根据 `needs_resign` 字段区分两种场景：
   - `needs_resign=false`：首次签约 → 引导业务员完成合作协议签署
   - `needs_resign=true`：管理员要求重新签约 → 展示"管理员要求您重新签署合作协议"提示
4. 引导业务员发起签署（调 `POST /api/v1/esign/agent-cooperation/start/`）
   - 如果返回 201：新签署任务已创建，前端跳转到 `sign_url`
   - 如果返回 200 + `"已完成合作协议签署，无需重复发起"`：无需签署，业务状态正常
   - 如果返回 200 + `signflow_id`：已有进行中的签署任务，直接跳转 `sign_url`
5. 签署完成后（e签宝回调自动更新状态），`can_do_business` 自动变为 true
6. 为 true 后，业务员可以正常创建订单和获取邀请码

### 申请再次签约（管理员重置后重新签约）

#### 业务场景

业务员签约已完成（`completed`），但管理员在后台通过"重置e签宝状态"操作将
`esign_cooperation_signed` 和/或 `esign_verified` 置为 `False`，目的是要求
业务员重新签署合作协议。由于签署任务状态机是线性且终态不可逆的
（`completed` 不能转为其他状态），管理员重置后业务陷入停滞：
`can_do_business` 为 `False`，但最新签署任务仍是 `completed`。

#### 解决方案

1. 管理员在 Django Admin 的「业务员Profile」中执行"重置e签宝状态"操作
   （将 `esign_verified` 和 `esign_cooperation_signed` 置为 `False`）
2. 业务员端通过 `GET /api/v1/esign/agent-cooperation/status/` 获取状态
   - 响应中 `needs_resign=true` 明确告知需要重新签约
   - `can_do_business=false` 确认当前无法开展业务
   - `esign_cooperation_signed=false` 指出具体哪个条件不满足
3. 前端展示"管理员要求您重新签署合作协议"提示 + "重新签署"按钮
4. 业务员点击 → `POST /api/v1/esign/agent-cooperation/start/`
   - 此时 `can_do_business=false`，不会触发"已完成"防护
   - 最新签署任务是 `completed`（非进行中），不会触发互斥拦截
   - 创建新的签署任务，返回 201 + 新 `signflow_id` + `sign_url`
5. 业务员完成签署 → e签宝 webhook 推送 `SIGN_FLOW_COMPLETE`
   → `esign_cooperation_signed` 自动更新为 `True`
   → `can_do_business` 变为 `True` → 业务恢复

#### 关键设计点

- **不修改已完成签署任务的状态**：旧的 `completed` 签署任务保持不变，作为
  历史审计记录；新的签署任务是独立的新行
- **互斥仅限于进行中任务**：`/start/` 接口只检查 `is_in_progress()` 的任务，
  已完成的任务不阻塞新任务创建
- **`can_do_business=true` 防护**：如果业务员已经完全合格（已完成签约且未被
  重置），`/start/` 返回 200 而非创建冗余签署任务
- **`needs_resign` 信号**：封装了"签过但被重置"的判断逻辑，前端无需自行推断

### 状态更新机制

`esign_verified` 和 `esign_cooperation_signed` 由 e签宝 webhook 回调自动更新，无需前端干预：

| 事件 | 更新字段 |
|------|---------|
| `AUTH_PASS` | `esign_verified = true` |
| `SIGN_FLOW_COMPLETE` | `esign_cooperation_signed = true` |

管理员可通过 Django Admin 的「业务员Profile」→「重置e签宝状态」操作将上述
字段重置为 `False`，触发"申请再次签约"流程。

## Design Notes

- The webhook endpoint always returns 200 to e签宝 — business errors are handled asynchronously by Celery tasks
- Duplicate webhook deliveries are detected via database-level `idempotency_key` unique constraint
- Sign flow status transitions are irreversible — a completed flow cannot be changed to rejected by a late callback
- All webhook deliveries are audited in `EsignNotifyAudit` regardless of processing outcome