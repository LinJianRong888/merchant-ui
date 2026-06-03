# Invitations API

## Purpose

The `invitations` module provides backend support for two invitation channels:

- **Channel A**: agent → customer (merchant-side, implemented)
- **Channel B**: organization → agent (biz-side, invitation QR code generation implemented)

This module only provides backend invitation support. Frontend is responsible for QR-code rendering, scene parameter handling, and choosing the invitation entry page.

---

## Channel A: Agent → Customer (Merchant Mini-Program)

### `GET /api/v1/invitations/agent-code/`

- Purpose: get the current authenticated agent user's invite code
- Authentication: JWT Bearer token required
- Permission: authenticated `agent` users only

Response example:

```json
{
  "user_id": 12,
  "user_type": "agent",
  "invite_code": "AbCdEfGhIjKlMnOpQrSt"
}
```

Behavior rules:

- invite code is sourced from `User.code`
- if current agent has no code yet, backend lazily generates one through `ensure_user_code(...)`
- non-agent users are rejected

### `POST /api/v1/invitations/merchant-miniapp/login/`

- Purpose: merchant-side invited login using WeChat miniapp code plus agent invite code
- Authentication: none
- Supported app: `merchant-miniapp` only

Request body:

```json
{
  "app_slug": "merchant-miniapp",
  "code": "wx-login-code",
  "invite_code": "AbCdEfGhIjKlMnOpQrSt"
}
```

Response example:

```json
{
  "refresh": "<jwt-refresh>",
  "access": "<jwt-access>",
  "app_slug": "merchant-miniapp",
  "identity_id": 22,
  "user_id": 35,
  "is_new_user": true,
  "user_type": "customer",
  "expired_at": null,
  "openid": "openid-invite-customer",
  "unionid": "unionid-invite-customer",
  "session_key": "session-invite-customer"
}
```

Behavior rules:

- backend resolves WeChat `openid` through `code2session`
- `invite_code` must match an existing `agent` user
- if current `openid` has no merchant identity, backend directly creates a `customer`
- created customer stores an invite registration record via `UserRegistration`
- invite registration uses:
  - `source_type=invite`
  - `inviting_user=<agent>`
  - `code=<invite_code>`
  - `app_slug=merchant-miniapp`
- if current `openid` is already bound to a `customer`, backend returns that customer login result
- if current `openid` is already bound to a non-customer user, backend rejects the request with conflict

---

## Channel B: Organization → Agent (Biz Mini-Program)

### Overview

Organizations invite agents through a WeChat mini-program QR code. The QR code is generated via Django Admin action and contains a scene parameter that encodes the organization's invite code.

### QR Code Parameters

| Parameter | Value |
|-----------|-------|
| `app_slug` | `biz-miniapp` |
| `page` | `pages/invite-entry/index` |
| `scene` | `invite_code=<organization.code>` |
| `env_version` | `trial` |
| `width` | `430` |

### `POST /api/v1/invitations/biz-miniapp/login/`

- Purpose: biz-side invited login using WeChat miniapp code plus organization invite code
- Authentication: none
- Supported app: `biz-miniapp` only

Request body:

```json
{
  "app_slug": "biz-miniapp",
  "code": "wx-login-code",
  "invite_code": "AbCdEfGhIjKlMnOpQrSt"
}
```

Response example:

```json
{
  "refresh": "<jwt-refresh>",
  "access": "<jwt-access>",
  "app_slug": "biz-miniapp",
  "identity_id": 22,
  "user_id": 35,
  "is_new_user": true,
  "user_type": "agent",
  "expired_at": null,
  "openid": "openid-invite-agent",
  "unionid": "unionid-invite-agent",
  "session_key": "session-invite-agent"
}
```

Behavior rules:

- backend resolves WeChat `openid` through `code2session`
- `invite_code` must match an existing `organization` user
- if current `openid` has no biz identity, backend directly creates an `agent`
- created agent stores an invite registration record via `UserRegistration`
- invite registration uses:
  - `source_type=invite`
  - `inviting_user=<organization>`
  - `code=<invite_code>`
  - `app_slug=biz-miniapp`
- if current `openid` is already bound to an `agent`, backend returns that agent login result
- if current `openid` is already bound to a non-agent user, backend rejects the request with conflict

---

## Service-Layer Entry Points

- `services.invitation.get_agent_invite_code(user=...)`
- `services.invitation.login_customer_by_agent_invitation(app_slug=..., code=..., invite_code=...)`
- `services.invitation.login_agent_by_organization_invitation(app_slug=..., code=..., invite_code=...)`
- `services.wechat.generate_agent_invitation_miniapp_code(invite_code=...)` — generates merchant-miniapp invite QR code for agent → customer
- `services.wechat.generate_organization_invitation_miniapp_code(invite_code=...)` — generates biz-miniapp invite QR code for organization → agent

## Domain Rules

- agent invitation entry is merchant-side only in the current scope
- invited user enters as `customer`, not `visitor`
- organization → agent invitation entry is biz-side only
- invited user enters as `agent`
- visitor-to-customer upgrade is handled by other flows and is not part of this module
- agent invitation support is backend-only; frontend owns QR-code routing and scene parsing
- organization → agent invitation QR codes point to `biz-miniapp` with `pages/invite-entry/index` and `invite_code=<org.code>` scene parameter
