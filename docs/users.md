# Users API

## Purpose

The users module exposes authenticated user identity data and the profile payload associated with the current user's `user_type`.

## Endpoints

### `GET /api/v1/users/me/`

- Purpose: return the currently authenticated user with profile data
- Authentication: JWT Bearer token required
- Permission: authenticated users only
- Request body: none

### `PATCH /api/v1/users/me/` (NEW 2026-07-20)

- Purpose: update the current Customer or Agent profile name
- Authentication: JWT Bearer token required
- Permission: active `customer` or `agent` only
- This updates `profile.name`; it does not modify the top-level `username`

Request:

```json
{
  "name": "林健荣"
}
```

`name` is trimmed, must not be blank, and may contain at most 100 characters.
Names are not globally unique. Success returns HTTP `200 OK` using the complete
`GET /api/v1/users/me/` response shape.

Visitor, Admin, and Organization users receive `403` with code
`user_profile_name_update_forbidden`. A missing role Profile or otherwise
invalid name returns `400`.

## Response Schema

Successful response returns HTTP `200 OK`.

```json
{
  "id": 1,
  "username": "agent-user",
  "email": "agent@example.com",
  "first_name": "",
  "last_name": "",
  "user_type": "agent",
  "code": null,
  "wechat_openid": "openid",
  "wechat_unionid": "unionid",
  "profile_id": 3,
  "is_active": true,
  "expired_at": null,
  "profile": {
    "id": 3,
    "profile_type": "agent",
    "name": "林健荣",
    "created_at": "2026-03-23T08:00:00Z",
    "updated_at": "2026-03-23T08:00:00Z",
    "phone": "13900000001",
    "license_number": "AG-001",
    "territory": "Guangzhou",
    "performance": {
      "monthly_sales": 100
    }
  }
}
```

If the user has no associated profile or the profile cannot be resolved, `profile` returns `null`.

### `POST /api/v1/users/visitor/convert-to-agent/` (NEW 2026-07-16)

- Purpose: convert the currently authenticated biz Visitor into Agent using an
  active Organization invite code
- Authentication: JWT Bearer token required
- Permission: Visitor only

Request:

```json
{
  "invite_code": "ORGANIZATION-CODE"
}
```

Success returns HTTP `200 OK` using the same schema as `GET /api/v1/users/me/`.
The user ID is preserved, `user_type` becomes `agent`, `expired_at` becomes null,
and the initial `can_do_business` value is false until Agent eSign requirements
are complete. Existing JWT tokens remain usable.

See `docs/api/agent-login-migration-v2026-07.md` for frontend routing and errors.

## Current Profile Types

- `admin`: returns admin profile fields such as `title` and `department`
- `customer`: returns customer profile fields such as `name`, `phone`, `address`, and `company`
- `agent`: returns agent profile fields such as `name`, `phone`, `license_number`, `territory`, and `performance`
- `organization`: returns organization profile fields such as `name`, `contact_name`, and `contact_phone`
- `visitor`: has no profile before role upgrade, so `profile` returns `null`

## Customer Profile Fields (NEW 2026-07-01)

`GET /api/v1/users/me/` now returns two additional e签宝 status fields when
the authenticated user is a `customer`.

```json
{
  "user_type": "customer",
  "profile": {
    "id": 8,
    "profile_type": "customer",
    "name": "示例商户负责人",
    "phone": "13800000001",
    "address": "广州市天河区",
    "company": "示例商户",
    "esign_verified": false,
    "esign_cooperation_signed": false
  }
}
```

| Field | Type | NEW | Description |
|-------|------|-----|-------------|
| `profile.esign_verified` | boolean | NEW 2026-07-01 | 商户 e签宝实名认证/签署完成确认状态 |
| `profile.esign_cooperation_signed` | boolean | NEW 2026-07-01 | 商户合作协议签署完成状态 |

For the full merchant signing integration contract, see
`docs/api/customer-esign-integration.md`.

## Service-Layer Entry Points

- `services.user.get_user_profile(user)`: resolves the profile instance from `user_type` and `profile_id`
- `services.user.get_user_info(user)`: returns the normalized response payload for the authenticated user
- `services.user.update_user_profile_phone(user, phone)`: updates profile phone for `customer` and `agent` with mainland mobile validation (`^1\d{10}$`, no `+86`)
- `services.user.update_user_profile_name(user, name)`: updates the current `customer` or `agent` role Profile name without changing `User.username`
- `services.user.ensure_user_code(user)`: idempotently generates and persists a URL-friendly recommendation code for a saved user when business approval allows it
- `services.user.create_user_registration(...)`: creates the single registration-origin record for a non-visitor user
- `services.user.get_user_registration(user)`: returns `None` for `visitor`, otherwise returns the user's `UserRegistration` record
- `services.user.convert_visitor_to_agent_by_organization_invite(...)`: converts a biz Visitor into Agent through an active Organization invite code and records the conversion audit

## Domain Rules

- `profile_id` is not a database foreign key, so profile resolution is handled in the service layer
- `code` is an optional unique recommendation code; it is not generated automatically at user creation time
- `wechat_openid` and `wechat_unionid` are optional identifiers used for WeChat account binding
- `visitor` users are created without a profile and may have a future `expired_at` used for trial-style expiration
- only an authenticated Visitor may call the Visitor conversion API
- Non-visitor users should have one `UserRegistration` record describing how they entered the system
- Invite-based registration stores the inviter's `code` as a snapshot together with `inviting_user_id`, `invited_user_id`, and `app_slug`
- `organization` is a formal profile-backed user type and is not allowed to be invite-registered
- `agent` invite registration is reserved for organization inviters
- API views should not implement profile branching rules directly
- The API should rely on `is_active` for user availability; expiration is processed separately by scheduled service logic

## Test Coverage

- Service tests cover `get_user_info(...)`
- API tests cover authentication, successful retrieval, and missing profile behavior
