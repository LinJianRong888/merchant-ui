# Orders API

## Purpose

The `orders` module provides unified order creation and listing while distinguishing order mode through `order_type`.

## Endpoints

### `GET /api/v1/orders/`

- Purpose: list current authenticated user's orders
- Authentication: JWT Bearer token required
- Permission: authenticated users only

Response example:

```json
[
  {
    "id": 10,
    "order_no": "SL1234567890ABCDEF1234",
    "order_type": "sale",
    "status": "pending",
    "shipment_status": "unshipped",
    "total_amount": "700.00",
    "created_at": "2026-04-13T10:00:00+08:00",
    "items": [
      {
        "product_id": 1,
        "product_name": "护眼贴",
        "product_image": "https://cdn.example.com/products/eye-mask.png",
        "quantity": 2
      }
    ]
  }
]
```

List response rules:

- list endpoint returns a compact order payload instead of full order detail
- each `item` includes product snapshot basics for list rendering: `product_id`, `product_name`, `product_image`, `quantity`
- `product_image` is stored as order-item snapshot at order creation time and may be blank

### `POST /api/v1/orders/`

- Purpose: create a mode-specific order for one product in the current minimal implementation
- Authentication: JWT Bearer token required
- Permission: authenticated users only

Request body:

```json
{
  "order_type": "sale",
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    },
    {
      "product_id": 3,
      "quantity": 1
    }
  ],
  "address": {
    "address_id": 5
  }
}
```

Address field compatibility:

- `address` is optional and defaults to `null` (backward compatible)
- `items` is required and must contain at least one product item
- each item requires `product_id` and positive `quantity`
- duplicate `product_id` entries are merged by service layer before stock check and order-item creation
- frontend may pass either:
  - address reference DTO: `{ "address_id": <id> }`
  - full address DTO object with user-address fields
- order service resolves address payload and persists an order-side snapshot into `Order.address`
- each line amount is `unit_price * quantity`
- order total is the sum of all line amounts across `items`

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
  "shipment_status": "unshipped",
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
      "product_image": "https://cdn.example.com/products/eye-mask.png",
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

### `POST /api/v1/orders/<order_id>/cancel/`

- Purpose: cancel the current user's pending order
- Authentication: JWT Bearer token required
- Permission: authenticated users only
- Request body: none

Response example:

```json
{
  "id": 10,
  "order_no": "SL1234567890ABCDEF1234",
  "status": "cancelled"
}
```

Cancel behavior:

- only the current order owner may cancel
- only `pending` orders may be cancelled
- cancellation sends an async stock-restore message through order signal handlers
- stock-restore task payload includes `order_id`, `quantity`, and `scene`

## Service-Layer Entry Points

- `services.order.create_order(user=..., order_type=..., items=[...])`
- `services.order.cancel_order(user=..., order=...)`
- `services.order.restore_order_stock(order_id=..., quantity=..., scene=...)`
- `services.user.resolve_order_address_payload(user=..., address_payload=...)`
- `services.order.list_orders(user=...)`
- `services.order.mark_order_paid(order=..., paid_amount=..., paid_at=...)`
- `services.order.close_order(order=..., reason=...)`
- `services.order.confirm_order_shipment(order=..., operator=...)`
- `services.order.create_order_wechat_prepay(user=..., order=...)`
- `services.order.handle_order_wechat_notify(account_slug=..., headers=..., body=...)`
- `orders.tasks.restore_order_stock_task(order_id=..., quantity=..., scene=...)`

## Domain Rules

- `sample` orders are only available to `agent`
- `sale` orders are only available to `customer`
- `visitor` may browse merchant-side products but may not create orders
- Order creation now supports multiple product lines per order
- `address` is optional for order creation to preserve backward compatibility
- when provided, `address` is validated and normalized by service layer into order snapshot JSON
- Product stock is deducted from the selected mode profile on successful order creation
- order cancellation does not restore stock inline; it emits an async stock-restore request message
- Order item snapshot currently stores `product_name`, `specification`, `product_mode`, `unit_price`, `quantity`, and `line_amount`
- order-item snapshot now also stores `product_image` for lightweight order list rendering
- Order lifecycle signals currently exist for `created`, `paid`, and `closed`, even though external queue side effects are still placeholders
- Overdue unpaid orders are now closed by a periodic Celery task with reason `payment_timeout`
- Payment initiation currently writes `prepay_request` and `prepay_response` audit records
- WeChat notify payloads are audited into `OrderPaymentAudit` before final order status handling
- A single order may have multiple payment audit records, but only one successful paid state is persisted on the order itself
- `sample` orders are tagged to `biz-miniapp`
- `sale` orders are tagged to `merchant-miniapp`
- shipment status is tracked separately from payment status through `shipment_status`
- current shipment status values are `unshipped` and `shipped`
- shipment confirmation currently creates one shipment record per order
- shipment rollback currently marks shipment record as rolled back (`rollback=true`, `rollback_at`) and resets order `shipment_status` to `unshipped`
- stock restore task validates message payload against the order's aggregated item quantity before applying inventory changes
