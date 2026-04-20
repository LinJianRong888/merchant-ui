# Orders API

## Purpose

The `orders` module provides unified order creation and listing while distinguishing order mode through `order_type`.

## Endpoints

### `GET /api/v1/orders/`

- Purpose: list current authenticated user's orders
- Authentication: JWT Bearer token required
- Permission: authenticated users only

### `POST /api/v1/orders/`

- Purpose: create a mode-specific order for one product in the current minimal implementation
- Authentication: JWT Bearer token required
- Permission: authenticated users only

Request body:

```json
{
  "order_type": "sale",
  "product_id": 1,
  "quantity": 2,
  "address": {
    "address_id": 5
  }
}
```

Address field compatibility:

- `address` is optional and defaults to `null` (backward compatible)
- frontend may pass either:
  - address reference DTO: `{ "address_id": <id> }`
  - full address DTO object with user-address fields
- order service resolves address payload and persists an order-side snapshot into `Order.address`

Response example:

```json
{
  "id": 10,
  "order_no": "SL1234567890ABCDEF1234",
  "order_type": "sale",
  "buyer_user_id": 8,
  "app_slug": "merchant-miniapp",
  "address": {
    "source": "user_address",
    "address_id": 5,
    "contact_name": "张三",
    "contact_phone": "13800138000",
    "province": "广东省",
    "city": "广州市",
    "district": "天河区",
    "address_detail": "体育西路 100 号",
    "postal_code": "510000"
  },
  "wxpay_account_slug": "",
  "payment_prepay_id": "",
  "wxpay_transaction_id": "",
  "status": "pending",
  "total_amount": "700.00",
  "paid_amount": "0.00",
  "paid_at": null,
  "payment_notified_at": null,
  "created_at": "2026-04-13T10:00:00+08:00",
  "updated_at": "2026-04-13T10:00:00+08:00",
  "items": [
    {
      "product_id": 1,
      "product_name": "护眼贴",
      "specification": "1Lx12盒/箱",
      "product_mode": "sale",
      "unit_price": "350.00",
      "quantity": 2,
      "line_amount": "700.00"
    }
  ]
}
```

### `POST /api/v1/orders/<order_id>/pay/`

- Purpose: create WeChat mini-program prepay parameters for a pending order
- Authentication: JWT Bearer token required
- Permission: authenticated users only

Current first-stage scope:

- only `sale` orders are supported for payment initiation
- only the current order owner may initiate payment

Response example:

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

## Service-Layer Entry Points

- `services.order.create_order(user=..., order_type=..., product_id=..., quantity=...)`
- `services.user.resolve_order_address_payload(user=..., address_payload=...)`
- `services.order.list_orders(user=...)`
- `services.order.mark_order_paid(order=..., paid_amount=..., paid_at=...)`
- `services.order.close_order(order=..., reason=...)`
- `services.order.create_order_wechat_prepay(user=..., order=...)`
- `services.order.handle_order_wechat_notify(account_slug=..., headers=..., body=...)`

## Domain Rules

- `sample` orders are only available to `agent`
- `sale` orders are only available to `customer`
- `visitor` may browse merchant-side products but may not create orders
- Order creation currently handles one product per order in the minimal implementation
- `address` is optional for order creation to preserve backward compatibility
- when provided, `address` is validated and normalized by service layer into order snapshot JSON
- Product stock is deducted from the selected mode profile on successful order creation
- Order item snapshot currently stores `product_name`, `specification`, `product_mode`, `unit_price`, `quantity`, and `line_amount`
- Order lifecycle signals currently exist for `created`, `paid`, and `closed`, even though external queue side effects are still placeholders
- Overdue unpaid orders are now closed by a periodic Celery task with reason `payment_timeout`
- Payment initiation currently writes `prepay_request` and `prepay_response` audit records
- WeChat notify payloads are audited into `OrderPaymentAudit` before final order status handling
- A single order may have multiple payment audit records, but only one successful paid state is persisted on the order itself
- `sample` orders are tagged to `biz-miniapp`
- `sale` orders are tagged to `merchant-miniapp`
