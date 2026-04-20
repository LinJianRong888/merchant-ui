# User Addresses API

## Purpose

The user-addresses module provides authenticated CRUD APIs for user shipping address records.

- Address records are linked directly to `users.User`
- This applies to all user types, including `visitor`
- API access is scoped to the current authenticated user only

## Endpoints

### `GET /api/v1/user-addresses/`

- Purpose: list current user's addresses
- Authentication: JWT Bearer token required
- Permission: authenticated users only

### `POST /api/v1/user-addresses/`

- Purpose: create an address for current user
- Authentication: JWT Bearer token required
- Permission: authenticated users only

Request body:

```json
{
  "contact_name": "张三",
  "contact_phone": "13800138000",
  "province": "广东省",
  "city": "广州市",
  "district": "天河区",
  "address_detail": "体育西路 100 号",
  "postal_code": "510000",
  "is_default": true
}
```

### `GET /api/v1/user-addresses/<address_id>/`

- Purpose: fetch one address of current user
- Authentication: JWT Bearer token required
- Permission: authenticated users only

### `PATCH /api/v1/user-addresses/<address_id>/`

- Purpose: partially update one address of current user
- Authentication: JWT Bearer token required
- Permission: authenticated users only

Request body (partial):

```json
{
  "city": "深圳市",
  "district": "南山区",
  "is_default": true
}
```

### `DELETE /api/v1/user-addresses/<address_id>/`

- Purpose: delete one address of current user
- Authentication: JWT Bearer token required
- Permission: authenticated users only

## Response Schema

Address payload:

```json
{
  "id": 1,
  "contact_name": "张三",
  "contact_phone": "13800138000",
  "province": "广东省",
  "city": "广州市",
  "district": "天河区",
  "address_detail": "体育西路 100 号",
  "postal_code": "510000",
  "is_default": true,
  "created_at": "2026-04-17T15:00:00+08:00",
  "updated_at": "2026-04-17T15:00:00+08:00"
}
```

`DELETE` returns HTTP `204 No Content`.

## Service-Layer Entry Points

- `services.user.list_user_addresses(user=...)`
- `services.user.get_user_address(user=..., address_id=...)`
- `services.user.create_user_address(user=..., **address_data)`
- `services.user.update_user_address(user=..., address_id=..., **address_data)`
- `services.user.delete_user_address(user=..., address_id=...)`

## Domain Rules

- Address ownership is strictly per authenticated user
- Cross-user address access returns `404`
- `contact_phone` must match mainland mobile format `^1\d{10}$`
- One user can have multiple addresses
- At most one default address is retained per user; setting one address as default clears default on other addresses of the same user

## Test Coverage

- Service tests cover CRUD, ownership restrictions, and default-switch behavior
- API tests cover JWT auth, CRUD success paths, ownership isolation, and invalid phone validation

## Frontend Integration Notes

Recommended checkout integration with orders API:

1. Call `GET /api/v1/user-addresses/` and let user choose an address.
2. Create order via `POST /api/v1/orders/` with one of:
   - `{ "address": { "address_id": <selected_id> } }`
   - `{ "address": { ...full address DTO... } }` for one-off address input
3. If frontend does not provide address yet, omit `address` or set `address: null`; backend remains backward compatible.

The order service resolves and stores an immutable address snapshot on the order side to avoid future drift from later address edits.
