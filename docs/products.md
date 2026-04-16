# Products API

## Purpose

The `products` module provides mode-specific product browsing for the two business surfaces:

- `sample` products for `biz-miniapp`
- `sale` products for `merchant-miniapp`

The product model uses one shared `Product` record plus per-mode profiles.

Current image field note:

- `Product.image`, `SampleProductProfile.image`, and `SaleProductProfile.image` are all nullable `ImageField`
- The project now uses `django-qiniu-storage` as the default file storage backend
- These product image fields therefore upload to Qiniu by default

## Endpoints

### `GET /api/v1/products/?mode=sample|sale`

- Purpose: list active products visible to the current user for the selected mode
- Authentication: JWT Bearer token required
- Permission: authenticated users only

Rules:

- `sample` list is only available to `agent`
- `sale` list is available to `customer` and `visitor`

Response shape note:

- The API does not return a nested `Product` plus nested profile structure
- It returns a flattened payload for the selected mode
- Shared fields come from `Product`
- Mode-specific fields come from the selected profile

Response item example:

```json
{
  "id": 1,
  "profile_id": 2,
  "mode": "sale",
  "name": "护眼贴",
  "description": "基础商品描述",
  "product_image": null,
  "image": null,
  "specification": "1Lx12盒/箱",
  "shelf_life": "6个月",
  "net_content": "1L",
  "packaging": "利乐包装",
  "price": "350.00",
  "stock": 12,
  "is_available": true,
  "created_at": "2026-04-13T09:00:00+08:00",
  "updated_at": "2026-04-13T09:00:00+08:00"
}
```

### `GET /api/v1/products/<product_id>/?mode=sample|sale`

- Purpose: return a single active product payload for the selected mode
- Authentication: JWT Bearer token required
- Permission: authenticated users only

## Service-Layer Entry Points

- `services.product.list_products(user=..., mode=...)`
- `services.product.get_product_detail(user=..., product_id=..., mode=...)`
- `services.product.get_product_mode_profile(product_id=..., mode=...)`

Current serializer/API contract fields:

- `id`
- `profile_id`
- `mode`
- `name`
- `description`
- `product_image`
- `image`
- `specification`
- `shelf_life`
- `net_content`
- `packaging`
- `price`
- `stock`
- `is_available`
- `created_at`
- `updated_at`

## Domain Rules

- `Product` stores shared identity and name-level information
- `SampleProductProfile` and `SaleProductProfile` each store their own specification, shelf life, net content, packaging, price, stock, and image
- Stock is mode-specific and currently implemented in the simplest form as a profile field
- `Product` also has its own nullable image field for shared product-level visuals
- The current implementation uses a flattened mode-specific API payload instead of nested profile objects
- A product may have both `sample` and `sale` profiles at the same time
- A product may temporarily have only one active mode profile, for example sample-only stock
