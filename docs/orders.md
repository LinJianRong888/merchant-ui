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
  "quantity": 2
}
```

Response example:

```json
{
  "id": 10,
  "order_no": "SL1234567890ABCDEF1234",
  "order_type": "sale",
  "buyer_user_id": 8,
  "app_slug": "merchant-miniapp",
  "status": "pending",
  "total_amount": "700.00",
  "paid_amount": "0.00",
  "paid_at": null,
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

## Service-Layer Entry Points

- `services.order.create_order(user=..., order_type=..., product_id=..., quantity=...)`
- `services.order.list_orders(user=...)`

## Domain Rules

- `sample` orders are only available to `agent`
- `sale` orders are only available to `customer`
- `visitor` may browse merchant-side products but may not create orders
- Order creation currently handles one product per order in the minimal implementation
- Product stock is deducted from the selected mode profile on successful order creation
- Order item snapshot currently stores `product_name`, `specification`, `product_mode`, `unit_price`, `quantity`, and `line_amount`
- `sample` orders are tagged to `biz-miniapp`
- `sale` orders are tagged to `merchant-miniapp`
