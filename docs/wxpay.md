# WxPay API

## Purpose

The `wxpay` API group currently exposes the remote callback entrypoint used by WeChat Pay notify mode.

Current admin/runtime note:

- Merchant payment config is currently maintained mainly through `WxPayAccount`
- The current order payment flow requires only a minimal set of merchant fields in admin
- Merchant private key file is not entered into admin text fields; it is read from on-disk file `wxpay/storage/<account_slug>/merchant/apiclient_key.pem`
- `APIv3密钥` means the API v3 key string from WeChat merchant platform, not the private key file

## Endpoints

### `POST /api/v1/wxpay/notify/<account_slug>/`

- Purpose: receive WeChat Pay remote callback notifications for a specific merchant account
- Authentication: none
- Permission: public callback endpoint

Behavior:

- request headers and raw body are passed into the order payment service
- callback data is parsed through `services.wxpay.parse_payment_callback(...)`
- resolved notify payloads are audited into `OrderPaymentAudit`
- successful callbacks update orders through `services.order.mark_order_paid(...)`

Response rules:

- success returns HTTP `204 No Content` with empty body
- callback validation or business rejection returns HTTP `4xx` with body:

```json
{
  "code": "FAIL",
  "message": "failure reason"
}
```

- internal server failure returns HTTP `5xx` with body:

```json
{
  "code": "FAIL",
  "message": "internal server error"
}
```

These response rules are intentionally aligned with WeChat Pay notify retry semantics so that WeChat stops retrying only after the callback is accepted successfully.

## Service-Layer Entry Points

- `services.wxpay.parse_payment_callback(...)`
- `services.order.handle_order_wechat_notify(...)`

## Domain Rules

- Current production flow focus is merchant-side `sale` orders
- Callback handling is idempotent for already-paid orders
- Callback handling currently audits resolved order notifications before final paid-state handling
- WeChat Pay callback success is acknowledged with `204 No Content`
- WeChat Pay callback failure is acknowledged with `FAIL` plus `4xx/5xx` so the upstream may retry
