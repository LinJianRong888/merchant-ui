# Debug Session: order-ship-sign-flow

**Status:** [OPEN]
**Created:** 2026-08-04
**Goal:** 测试下单 → 运输 → 签收全流程在订单详情页的展示是否正确

## Hypotheses

1. **H1 - 订单状态流程正确**: 订单状态从 pending → paid → shipped → completed 的过渡，timeline 各步骤按顺序点亮
2. **H2 - 物流轨迹渲染正确**: 发货后物流追踪面板正确展示揽收/运输/派送/签收轨迹
3. **H3 - 底部操作按钮随状态变化**: pending 显示取消+支付，非 cancelled 显示售后+客服+物流
4. **H4 - API 返回数据映射正确**: 后端返回的 status/shipment_status/status_label 正确驱动前端状态显示
5. **H5 - tracking 面板开闭和刷新正常**: 查看物流弹窗打开/关闭、数据加载和重新查询正常

## Log Collection Points

- `orders-detail-load`: 订单详情页加载完成
- `orders-detail-status`: 状态映射结果
- `orders-tracking-open`: 物流面板打开
- `orders-tracking-data`: 物流数据返回
- `orders-timeline`: timeline 计算
