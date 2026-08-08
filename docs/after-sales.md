# Customer 售后 API V1 对接说明

## 文档信息

- 版本：V1
- 日期：2026-08-05
- 面向对象：商户端小程序前端
- API 前缀：`/api/v1`
- 认证方式：JWT Bearer Token

## 一、当前已实现范围

当前 V1 已实现：

- Customer 上传可选的售后凭证图片
- Customer 创建售后申请
- Customer 查询自己的售后申请列表
- Customer 查询自己的售后申请详情
- Customer 取消仍处于待审核状态的售后申请

当前 V1 尚未实现：

- Admin 审核通过或驳回
- Customer 提交退货快递公司和退货运单号
- Admin 确认收到退货
- 微信支付原路退款

前端本阶段只对接本文列出的已实现接口，不应展示审核、填写退货运单或退款完成操作。

## 二、业务规则

### 2.1 支持的订单

- 仅支持当前登录 Customer 自己的正式销售订单，即 `order_type=sale`。
- Agent 的样品订单不支持售后。
- 订单必须已经成功支付，且 `paid_amount > 0`。

### 2.2 仅退款

- 申请类型为 `refund_only`。
- 只允许 `shipment_status=unshipped` 的订单申请。
- 已发货后又由后台撤销发货的订单会恢复为 `unshipped`，可以申请仅退款。

### 2.3 退货退款

- 申请类型为 `return_refund`。
- 只允许 `shipment_status=received` 的订单申请。
- 必须在 `ORDER_AFTER_SALE_PERIOD_DAYS` 配置的售后期限内申请，当前默认 7 天。
- `shipment_status=shipped` 表示运输中，后端会拒绝所有售后申请，必须等待签收。

### 2.4 商品、数量和金额

- 支持一张订单中的部分商品申请售后。
- 支持一个商品中的部分数量申请售后。
- 退款金额由后端按照订单成交单价乘以申请数量计算，前端不能传入退款金额。
- 后端会累计检查同一订单的售后数量和售后金额，避免重复或超额申请。
- 已取消的申请会释放数量和金额占用，但申请历史仍然保留。

### 2.5 售后凭证

- 售后原因 `reason` 必填。
- 凭证图片选填。
- 一次上传接口请求只能上传一张图片。
- 每次上传成功后返回一个 `upload_id`。
- 创建售后申请时统一提交本次使用的 `upload_id` 数组。
- 当前默认一张售后申请最多使用 6 张凭证图片。

## 三、获取订单和订单明细 ID

### 接口

`GET /api/v1/orders/{order_id}/`

### 重要说明

售后申请使用的是订单明细 ID，即订单详情中的 `items[].id`。

前端必须把 `items[].id` 作为售后申请的 `order_item_id`，不能使用 `product_id` 代替。

### 订单明细示例

```json
{
  "id": 501,
  "order_no": "202608050001",
  "order_type": "sale",
  "status": "paid",
  "shipment_status": "unshipped",
  "paid_amount": "180.00",
  "items": [
    {
      "id": 701,
      "product_id": 33,
      "product_name": "商品名称",
      "product_image": "https://cdn.example.com/product.jpg",
      "specification": "一箱",
      "product_mode": "sale",
      "unit_price": "90.00",
      "quantity": 2,
      "line_amount": "180.00"
    }
  ]
}
```

## 四、上传售后凭证图片

### 接口

`POST /api/v1/uploads/images/`

### 请求头

```text
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

### 请求字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `file` | File | 是 | JPEG、PNG 或 WebP 图片 |
| `purpose` | String | 是 | 固定传 `after_sale_evidence` |
| `context_id` | Integer | 是 | 本次申请对应的订单 ID |

一次请求只能上传一张图片。小程序应分别调用 `wx.uploadFile` 上传每张图片。

### 成功响应

HTTP 状态码：`201 Created`

```json
{
  "upload_id": "81fb6298-51d8-4e04-97c2-2c085abcaa62",
  "purpose": "after_sale_evidence",
  "context_id": 501,
  "url": "https://cdn.example.com/after_sale_evidence/9/501/image.jpg",
  "content_type": "image/jpeg",
  "size": 352144,
  "status": "uploaded",
  "created_at": "2026-08-05T14:00:00+08:00",
  "expires_at": "2026-08-06T14:00:00+08:00"
}
```

前端只需要保存响应中的 `upload_id`，创建售后申请时提交该 ID。

## 五、创建售后申请

### 接口

`POST /api/v1/after-sales/`

### 请求头

```text
Authorization: Bearer {access_token}
Content-Type: application/json
```

### 请求字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `order_id` | Integer | 是 | 订单 ID |
| `request_type` | String | 是 | `refund_only` 或 `return_refund` |
| `reason` | String | 是 | 售后原因，最长 2000 字符 |
| `items` | Array | 是 | 申请售后的订单明细，至少一项 |
| `items[].order_item_id` | Integer | 是 | 订单详情响应中的 `items[].id` |
| `items[].quantity` | Integer | 是 | 本次申请数量，必须大于 0 |
| `upload_ids` | UUID Array | 否 | 售后凭证上传 ID，默认最多 6 个 |

### 请求示例

```json
{
  "order_id": 501,
  "request_type": "refund_only",
  "reason": "商品不再需要",
  "items": [
    {
      "order_item_id": 701,
      "quantity": 1
    }
  ],
  "upload_ids": [
    "81fb6298-51d8-4e04-97c2-2c085abcaa62"
  ]
}
```

没有凭证时可以省略 `upload_ids`，也可以传空数组：

```json
{
  "order_id": 501,
  "request_type": "refund_only",
  "reason": "商品不再需要",
  "items": [
    {
      "order_item_id": 701,
      "quantity": 1
    }
  ],
  "upload_ids": []
}
```

### 成功响应

HTTP 状态码：`201 Created`

```json
{
  "request_id": "eec4a8be-1332-49b8-8cb5-54fbb312a2b1",
  "order_id": 501,
  "order_no": "202608050001",
  "request_type": "refund_only",
  "status": "applied",
  "can_cancel": true,
  "reason": "商品不再需要",
  "requested_amount": "90.00",
  "order_paid_amount_snapshot": "180.00",
  "shipment_status_snapshot": "unshipped",
  "received_at_snapshot": null,
  "after_sale_period_days_snapshot": 7,
  "return_courier_company": null,
  "return_tracking_no": "",
  "return_shipped_at": null,
  "applied_at": "2026-08-05T15:00:00+08:00",
  "updated_at": "2026-08-05T15:00:00+08:00",
  "approved_at": null,
  "rejected_at": null,
  "cancelled_at": null,
  "returned_at": null,
  "refund_started_at": null,
  "refunded_at": null,
  "closed_at": null,
  "items": [
    {
      "id": 1,
      "order_item_id": 701,
      "product_id": 33,
      "product_name": "商品名称",
      "product_image": "https://cdn.example.com/product.jpg",
      "specification": "一箱",
      "unit_price": "90.00",
      "purchased_quantity": 2,
      "requested_quantity": 1,
      "requested_amount": "90.00"
    }
  ],
  "evidence": [
    {
      "upload_id": "81fb6298-51d8-4e04-97c2-2c085abcaa62",
      "url": "https://cdn.example.com/after_sale_evidence/9/501/image.jpg",
      "content_type": "image/jpeg",
      "size": 352144
    }
  ],
  "timeline": [
    {
      "action": "applied",
      "from_status": "",
      "to_status": "applied",
      "reason": "商品不再需要",
      "occurred_at": "2026-08-05T15:00:00+08:00"
    }
  ]
}
```

## 六、查询售后申请列表

### 接口

`GET /api/v1/after-sales/`

### 说明

- 只返回当前登录 Customer 自己的售后申请。
- 按申请时间倒序排列。
- 当前响应为数组，不分页。
- 数组中每一项的结构与创建接口成功响应一致。

### 成功响应

HTTP 状态码：`200 OK`

```json
[
  {
    "request_id": "eec4a8be-1332-49b8-8cb5-54fbb312a2b1",
    "order_id": 501,
    "order_no": "202608050001",
    "request_type": "refund_only",
    "status": "applied",
    "can_cancel": true,
    "reason": "商品不再需要",
    "requested_amount": "90.00",
    "items": [],
    "evidence": [],
    "timeline": []
  }
]
```

实际响应会包含与详情接口相同的全部时间和快照字段，示例仅缩短展示。

## 七、查询售后申请详情

### 接口

`GET /api/v1/after-sales/{request_id}/`

### 说明

- `request_id` 是创建售后申请后返回的 UUID。
- 返回结构与创建接口成功响应一致。
- 访问其他 Customer 的申请时返回 `404`，不会暴露申请是否存在。

### 成功响应

HTTP 状态码：`200 OK`

## 八、取消售后申请

### 接口

`POST /api/v1/after-sales/{request_id}/cancel/`

### 请求字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `reason` | String | 否 | 取消原因，最长 1000 字符 |

### 请求示例

```json
{
  "reason": "不再申请售后"
}
```

### 当前 V1 取消规则

- 只有 `status=applied` 时允许 Customer 取消。
- 前端应根据响应中的 `can_cancel` 判断是否显示取消按钮。
- 即使 `can_cancel=true`，提交时仍需处理后端返回的状态冲突，因为状态可能已经发生变化。

### 成功响应

HTTP 状态码：`200 OK`

返回完整售后申请，关键字段变为：

```json
{
  "status": "cancelled_by_customer",
  "can_cancel": false,
  "cancelled_at": "2026-08-05T16:00:00+08:00"
}
```

## 九、当前 V1 状态

| 状态 | 前端文案建议 | `can_cancel` |
|---|---|---:|
| `applied` | 待审核 | `true` |
| `cancelled_by_customer` | 已取消 | `false` |

其它审批、退货和退款状态将在后续阶段对应 API 实现后另行通知前端，本阶段不需要提前实现操作入口。

## 十、错误响应格式

业务错误通常返回：

```json
{
  "code": "refund_only_requires_unshipped",
  "detail": "仅未发货订单支持仅退款"
}
```

主要错误码：

| HTTP | `code` | 说明 |
|---:|---|---|
| `400` | `order_not_paid` | 订单尚未成功支付 |
| `400` | `unsupported_order_type` | 当前订单类型不支持售后 |
| `400` | `refund_only_requires_unshipped` | 仅退款订单不是未发货状态 |
| `400` | `shipment_in_transit` | 订单运输中，需签收后再申请 |
| `400` | `return_refund_requires_received` | 退货退款订单尚未签收 |
| `400` | `after_sale_period_expired` | 已超过售后申请期限 |
| `400` | `items_required` | 未选择售后商品 |
| `400` | `duplicate_order_item` | 同一订单明细重复提交 |
| `400` | `order_item_not_found` | 明细不属于当前订单 |
| `400` | `after_sale_quantity_exceeded` | 累计售后数量超过可申请数量 |
| `400` | `after_sale_amount_exceeded` | 累计售后金额超过订单实付金额 |
| `400` | `upload_not_found` | 部分上传凭证不存在 |
| `400` | `upload_context_mismatch` | 凭证用途或所属订单不匹配 |
| `400` | `upload_unavailable` | 凭证已经使用或失效 |
| `400` | `upload_expired` | 凭证已过期 |
| `400` | `after_sale_not_cancellable` | 当前售后状态不允许取消 |
| `403` | `customer_not_available` | 当前用户不是有效 Customer |
| `403` | `upload_not_owned` | 凭证属于其他用户 |
| `404` | `order_not_found` | 订单不存在或不属于当前用户 |
| `404` | `after_sale_not_found` | 售后申请不存在或不属于当前用户 |

## 十一、前端推荐调用流程

1. 调用订单详情接口，读取订单的 `shipment_status` 和 `items[].id`。
2. 根据发货状态展示当前可选的申请类型。
3. 用户选择商品、数量并填写售后原因。
4. 如果有凭证，逐张调用图片上传接口并收集 `upload_id`。
5. 调用创建售后申请接口。
6. 使用返回的 `request_id` 查询详情。
7. 根据 `status` 和 `can_cancel` 展示当前 V1 状态及取消按钮。

