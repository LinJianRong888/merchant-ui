# Merchant Miniapp Payment Guide

## Purpose

This document explains how the merchant mini-program should initiate order payment against the current backend implementation.

## Current Scope

- App: `merchant-miniapp`
- Supported payer user type: `customer`
- Unsupported payer user type: `visitor`
- Supported order type for payment initiation: `sale`
- Final payment success source of truth: backend order status updated by WeChat Pay `notify`

## Backend Endpoints Used By Frontend

### 1. Login

- `POST /api/v1/wx/miniapp/login/`
- Use `app_slug=merchant-miniapp`

### 2. Create order

- `POST /api/v1/orders/`
- Requires JWT Bearer token

Example:

```json
{
  "order_type": "sale",
  "product_id": 1,
  "quantity": 2
}
```

### 3. Create payment parameters

- `POST /api/v1/orders/<order_id>/pay/`
- Requires JWT Bearer token

Successful response:

```json
{
  "order_id": 10,
  "order_no": "SL1234567890ABCDEF1234",
  "prepay_id": "wx201410272009395522657a690389285100",
  "request_payment": {
    "appId": "wx1234567890abcdef",
    "timeStamp": "1710000000",
    "nonceStr": "nonce",
    "package": "prepay_id=wx201410272009395522657a690389285100",
    "signType": "RSA",
    "paySign": "signature"
  }
}
```

### 4. Refresh order status

- `GET /api/v1/orders/`
- Requires JWT Bearer token
- Frontend should refresh the order list and locate the target order by `order_id` or `order_no`

## Frontend Integration Flow

1. Call mini-program login and store the backend JWT.
2. Create a `sale` order.
3. Call `POST /api/v1/orders/<order_id>/pay/`.
4. Pass `request_payment` directly into `wx.requestPayment`.
5. After `wx.requestPayment` returns, do not treat the frontend callback as final order success.
6. Refresh backend order status through `GET /api/v1/orders/` until the target order becomes `paid`, or show a pending state and let the page re-enter refresh later.

## `wx.requestPayment` Mapping

Use backend `request_payment` fields as-is:

```javascript
const { request_payment } = payResponse

await wx.requestPayment({
  timeStamp: request_payment.timeStamp,
  nonceStr: request_payment.nonceStr,
  package: request_payment.package,
  signType: request_payment.signType,
  paySign: request_payment.paySign,
})
```

Notes:

- `appId` is returned by backend for traceability, but `wx.requestPayment` itself does not require frontend to pass `appId`
- Frontend must not rebuild or modify the sign payload

## Frontend State Rules

- `wx.requestPayment` success only means the client-side payment sheet completed successfully
- Final order success must be judged by backend order state becoming `paid`
- If `wx.requestPayment` fails or is cancelled, frontend should show a user-facing failure/cancel state, but still allow the user to retry payment later while the order remains `pending`
- Because WeChat may deliver notify later, frontend should support a short polling or manual refresh path after payment sheet completion

## Recommended Page Logic

After creating the order, frontend can keep the following minimal states:

- `pending_payment`: order created but payment not started
- `paying`: backend prepay created and `wx.requestPayment` is in progress
- `pending_confirm`: payment sheet returned, waiting for backend notify to confirm
- `paid`: backend order status is `paid`
- `failed`: backend prepay request failed, or `wx.requestPayment` failed/cancelled

## Error Handling Guidance

- `403` on order creation or payment initiation usually means current user type is not allowed for the action
- `400` on payment initiation usually means the order is not payable, such as wrong owner, non-`sale` order, or non-`pending` status
- If payment sheet completed but backend still shows `pending`, frontend should not mark the order paid locally; instead show “payment confirmation in progress” and refresh from backend

## Current Backend Constraints

- Current order API only exposes order list, not a single order detail endpoint
- Current payment integration is only implemented for merchant-side `sale` orders
- Current backend truth source is WeChat remote notify plus backend order status transition
