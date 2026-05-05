# Users API

## Purpose

The users module exposes authenticated user identity data and the profile payload associated with the current user's `user_type`.

## Endpoints

### `GET /api/v1/users/me/`

- Purpose: return the currently authenticated user with profile data
- Authentication: JWT Bearer token required
- Permission: authenticated users only
- Request body: none

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

## Current Profile Types

- `admin`: returns admin profile fields such as `title` and `department`
- `customer`: returns customer profile fields such as `phone`, `address`, and `company`
- `agent`: returns agent profile fields such as `phone`, `license_number`, `territory`, and `performance`
- `organization`: returns organization profile fields such as `name`, `contact_name`, and `contact_phone`
- `visitor`: has no profile before role upgrade, so `profile` returns `null`

## Service-Layer Entry Points

- `services.user.get_user_profile(user)`: resolves the profile instance from `user_type` and `profile_id`
- `services.user.get_user_info(user)`: returns the normalized response payload for the authenticated user
- `services.user.update_user_profile_phone(user, phone)`: updates profile phone for `customer` and `agent` with mainland mobile validation (`^1\d{10}$`, no `+86`)
- `services.user.ensure_user_code(user)`: idempotently generates and persists a URL-friendly recommendation code for a saved user when business approval allows it
- `services.user.create_user_registration(...)`: creates the single registration-origin record for a non-visitor user
- `services.user.get_user_registration(user)`: returns `None` for `visitor`, otherwise returns the user's `UserRegistration` record
- `services.user.upgrade_visitor_to_agent(user, profile_data=...)`: upgrades a visitor user into an agent and creates the new profile

## Domain Rules

- `profile_id` is not a database foreign key, so profile resolution is handled in the service layer
- `code` is an optional unique recommendation code; it is not generated automatically at user creation time
- `wechat_openid` and `wechat_unionid` are optional identifiers used for WeChat account binding
- `visitor` users are created without a profile and may have a future `expired_at` used for trial-style expiration
- Non-visitor users should have one `UserRegistration` record describing how they entered the system
- Invite-based registration stores the inviter's `code` as a snapshot together with `inviting_user_id`, `invited_user_id`, and `app_slug`
- `organization` is a formal profile-backed user type and is not allowed to be invite-registered
- `agent` invite registration is reserved for organization inviters
- API views should not implement profile branching rules directly
- The API should rely on `is_active` for user availability; expiration is processed separately by scheduled service logic

## Test Coverage

- Service tests cover `get_user_info(...)`
- API tests cover authentication, successful retrieval, and missing profile behavior
