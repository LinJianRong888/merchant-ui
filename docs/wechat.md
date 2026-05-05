# WeChat Module

## Purpose

The `wechat` module provides dynamic multi-miniapp WeChat integration support.

- It does not expose HTTP API endpoints directly
- It manages WeChat app configuration in the database
- It manages user-to-openid identity bindings through a dedicated relation model
- It provides reusable service-layer capabilities for login/session related WeChat behavior
- It enforces app-specific mini-program access rules used by `api/v1/wx/`

## Endpoints

There are no public API endpoints for this module yet.

## Data Model

### `WeChatApp`

- Stores dynamic WeChat mini-program configuration such as `app_id` and `app_secret`
- Uses a unique `slug` for service-layer lookup
- Supports future expansion for multiple mini-program accounts

### `WeChatUserIdentity`

- Stores the many-to-one relation between WeChat openids and local users
- Identity is unique per `app + openid`
- Stores `unionid` only as optional supplemental data
- Stores the latest `session_key` and `last_login_at`

## Service-Layer Entry Points

- `services.wechat.get_wechat_app_by_slug(slug)` returns an active WeChat app config
- `services.wechat.get_wechat_client_by_app_slug(slug)` returns a dynamic `wechatpy` client
- `services.wechat.get_wechat_session(app_slug, code)` wraps `code_to_session`
- `services.wechat.get_phone_number(app_slug, code)` wraps mini-program phone-number retrieval
- `services.wechat.get_user_phone_number(user, app_slug, code, update_profile_phone=False)` validates current-user access and identity before phone-number retrieval, and may update the current user's profile phone when requested
- `services.wechat.get_or_create_wechat_user_identity(...)` maintains app/openid-to-user bindings
- `services.wechat.login_or_register_wechat_user(app_slug, code)` performs WeChat login orchestration and returns token/session payload
- `services.wechat.get_user_info(user, app_slug)` returns the current authenticated user's active identity payload for the selected mini-program

## Important Rules

- `openid` is treated as app-scoped identity, not global identity
- `unionid` is not the primary join key because multiple mini-programs may not share the same主体
- `biz-miniapp` only allows existing `agent` users and rejects missing bindings with `403 invitation_required`
- `merchant-miniapp` only allows `visitor` and `customer` users and may auto-register `visitor` on first login

## Test Coverage

- Model tests cover required identity constraints
- Service tests cover dynamic app lookup, client construction, session retrieval, identity binding, login orchestration, and WeChat-only user info lookup
