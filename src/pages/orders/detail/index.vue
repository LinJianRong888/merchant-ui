<template>
  <view class="order-detail-page">
    <view v-if="isLoading" class="detail-skeleton">
      <view class="skeleton-line skeleton-line--title"></view>
      <view class="skeleton-line"></view>
      <view class="skeleton-line skeleton-line--short"></view>
      <view class="skeleton-line"></view>
      <view class="skeleton-line"></view>
      <view class="skeleton-line skeleton-line--short"></view>
    </view>

    <view v-else-if="isError" class="detail-state-panel">
      <text class="detail-state-panel__title">加载失败</text>
      <text class="detail-state-panel__desc">{{ errorMessage }}</text>
      <button class="detail-state-panel__button" :loading="isFetching" @tap="refetch">重试</button>
    </view>

    <view v-else-if="order" class="detail-shell">
      <view class="detail-card">
        <view class="detail-card__header">
          <text class="detail-card__title">订单信息</text>
          <text :class="['detail-badge', statusMeta.className]">{{ statusMeta.label }}</text>
        </view>
        <view class="detail-info-grid">
          <view class="detail-info-item">
            <text class="detail-info-item__label">订单编号</text>
            <text class="detail-info-item__value">{{ order.order_no || '--' }}</text>
          </view>
          <view class="detail-info-item">
            <text class="detail-info-item__label">订单类型</text>
            <text class="detail-info-item__value">{{ orderTypeLabel }}</text>
          </view>
          <view class="detail-info-item">
            <text class="detail-info-item__label">下单时间</text>
            <text class="detail-info-item__value">{{ createdAtText }}</text>
          </view>
          <view v-if="order.paid_at" class="detail-info-item">
            <text class="detail-info-item__label">支付时间</text>
            <text class="detail-info-item__value">{{ formatDateTime(order.paid_at) }}</text>
          </view>
        </view>
      </view>

      <!-- 售后进度 - 进行中 -->
      <view v-if="activeAfterSale" class="detail-card detail-card--aftersale">
        <view class="detail-card__header">
          <text class="detail-card__title">售后进度</text>
          <text class="aftersale-status-tag">{{ afterSaleStatusText }}</text>
        </view>
        <view class="detail-info-grid">
          <view class="detail-info-item">
            <text class="detail-info-item__label">售后类型</text>
            <text class="detail-info-item__value">{{ afterSaleTypeLabel }}</text>
          </view>
          <view class="detail-info-item">
            <text class="detail-info-item__label">申请原因</text>
            <text class="detail-info-item__value">{{ activeAfterSale.reason || '--' }}</text>
          </view>
          <view class="detail-info-item">
            <text class="detail-info-item__label">申请时间</text>
            <text class="detail-info-item__value">{{ activeAfterSale.applied_at ? formatDateTime(activeAfterSale.applied_at) : '--' }}</text>
          </view>
          <view v-if="activeAfterSale.requested_amount" class="detail-info-item">
            <text class="detail-info-item__label">退款金额</text>
            <text class="detail-info-item__value is-highlight">{{ formatPrice(activeAfterSale.requested_amount) }}</text>
          </view>
        </view>

        <!-- 凭证图片 -->
        <view v-if="afterSaleEvidence.length" class="aftersale-evidence">
          <text class="aftersale-evidence__title">凭证图片</text>
          <view class="aftersale-evidence__list">
            <image v-for="(img, idx) in afterSaleEvidence" :key="idx" class="aftersale-evidence__img" :src="img.url || img" mode="aspectFill" @tap="previewEvidence(idx)" />
          </view>
        </view>

        <!-- 退货物流 -->
        <view v-if="hasReturnLogisticsInfo" class="aftersale-return">
          <text class="aftersale-return__title">退货物流</text>
          <view class="detail-info-grid">
            <view class="detail-info-item">
              <text class="detail-info-item__label">快递公司</text>
              <text class="detail-info-item__value">{{ activeAfterSale.return_courier_company }}</text>
            </view>
            <view v-if="activeAfterSale.return_tracking_no" class="detail-info-item">
              <text class="detail-info-item__label">快递单号</text>
              <view class="detail-info-item__value-row">
                <text class="detail-info-item__value">{{ activeAfterSale.return_tracking_no }}</text>
                <text class="detail-info-item__copy" @tap="copyReturnTrackingNo">复制</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 填写退货物流按钮（V1 暂不支持，后续版本启用） -->
        <!-- <view v-if="showReturnLogisticsButton && !hasReturnLogisticsInfo" class="aftersale-return-btn" @tap="openReturnLogisticsModal">
          <text>填写退货物流</text>
        </view> -->

        <!-- 售后时间线（后端数据优先） -->
        <view v-if="afterSaleTimeline.length" class="aftersale-timeline">
          <text class="aftersale-timeline__title">处理记录</text>
          <view v-for="(entry, idx) in afterSaleTimeline" :key="idx" :class="['aftersale-tl-item', { 'aftersale-tl-item--latest': idx === 0 }]">
            <view class="aftersale-tl-item__dot"></view>
            <view v-if="idx < afterSaleTimeline.length - 1" class="aftersale-tl-item__line"></view>
            <view class="aftersale-tl-item__body">
              <text class="aftersale-tl-item__title">{{ entry.title }}</text>
              <text v-if="entry.time" class="aftersale-tl-item__time">{{ entry.time }}</text>
              <text v-if="entry.desc" class="aftersale-tl-item__desc">{{ entry.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 兜底：无timeline时用步骤条 -->
        <view v-else class="aftersale-progress">
          <view v-for="(step, idx) in afterSaleSteps" :key="idx" :class="['aftersale-step', { 'aftersale-step--active': step.active, 'aftersale-step--done': step.done }]">
            <view class="aftersale-step__dot">
              <text v-if="step.done" class="aftersale-step__icon">✓</text>
              <text v-else-if="step.active" class="aftersale-step__icon">●</text>
              <text v-else class="aftersale-step__num">{{ idx + 1 }}</text>
            </view>
            <text class="aftersale-step__label">{{ step.label }}</text>
          </view>
        </view>
      </view>

      <!-- 售后进度 - 已拒绝 -->
      <view v-else-if="rejectedAfterSale" class="detail-card detail-card--aftersale">
        <view class="detail-card__header">
          <text class="detail-card__title">售后进度</text>
          <text class="aftersale-status-tag aftersale-status-tag--rejected">审核拒绝</text>
        </view>
        <view class="detail-info-grid">
          <view class="detail-info-item">
            <text class="detail-info-item__label">售后类型</text>
            <text class="detail-info-item__value">{{ afterSaleTypeLabel }}</text>
          </view>
          <view v-if="rejectedAfterSale.requested_amount" class="detail-info-item">
            <text class="detail-info-item__label">退款金额</text>
            <text class="detail-info-item__value is-highlight">{{ formatPrice(rejectedAfterSale.requested_amount) }}</text>
          </view>
          <view class="detail-info-item">
            <text class="detail-info-item__label">申请时间</text>
            <text class="detail-info-item__value">{{ rejectedAfterSale.applied_at ? formatDateTime(rejectedAfterSale.applied_at) : '--' }}</text>
          </view>
        </view>
        <view v-if="rejectReason" class="aftersale-reject">
          <text class="aftersale-reject__label">驳回原因</text>
          <text class="aftersale-reject__text">{{ rejectReason }}</text>
        </view>
      </view>

      <!-- 售后进度 - 已完成 -->
      <view v-else-if="completedAfterSale" class="detail-card detail-card--aftersale detail-card--aftersale-completed">
        <view class="detail-card__header">
          <text class="detail-card__title">售后进度</text>
          <text class="aftersale-status-tag aftersale-status-tag--completed">{{ afterSaleStatusText }}</text>
        </view>
        <view class="detail-info-grid">
          <view class="detail-info-item">
            <text class="detail-info-item__label">售后类型</text>
            <text class="detail-info-item__value">{{ afterSaleTypeLabel }}</text>
          </view>
          <view v-if="completedAfterSale.requested_amount" class="detail-info-item">
            <text class="detail-info-item__label">退款金额</text>
            <text class="detail-info-item__value is-highlight">{{ formatPrice(completedAfterSale.requested_amount) }}</text>
          </view>
          <view class="detail-info-item">
            <text class="detail-info-item__label">申请时间</text>
            <text class="detail-info-item__value">{{ completedAfterSale.applied_at ? formatDateTime(completedAfterSale.applied_at) : '--' }}</text>
          </view>
        </view>
      </view>

      <!-- 售后进度 - 已取消 -->
      <view v-else-if="cancelledAfterSale" class="detail-card detail-card--aftersale">
        <view class="detail-card__header">
          <text class="detail-card__title">售后进度</text>
          <text class="aftersale-status-tag aftersale-status-tag--cancelled">{{ afterSaleStatusText }}</text>
        </view>
      </view>

      <view class="detail-card">
        <text class="detail-card__title">商品信息</text>
        <view class="detail-products">
          <view v-for="(item, idx) in orderItems" :key="idx" class="detail-product">
            <view class="detail-product__image">
              <text v-if="!item.product_image" class="detail-product__placeholder">📷</text>
              <image v-else :src="item.product_image" class="detail-product__img" mode="aspectFill" />
            </view>
            <view class="detail-product__info">
              <text class="detail-product__name">{{ item.product_name || '商品' }}</text>
              <text v-if="item.specification" class="detail-product__spec">{{ item.specification }}</text>
              <view class="detail-product__row">
                <text class="detail-product__price">¥{{ formatItemPrice(item.unit_price) }}</text>
                <text class="detail-product__qty">×{{ item.quantity }}</text>
                <text class="detail-product__subtotal">小计 ¥{{ formatItemSubtotal(item) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="detail-card">
        <text class="detail-card__title">金额明细</text>
        <view class="detail-amounts">
          <view class="detail-amounts__row">
            <text class="detail-amounts__label">运费</text>
            <text class="detail-amounts__value is-muted">免运费</text>
          </view>
          <view class="detail-amounts__row detail-amounts__row--total">
            <text class="detail-amounts__label">实付款</text>
            <text class="detail-amounts__value">{{ formatPrice(order.total_amount) }}</text>
          </view>
        </view>
      </view>

      <view class="detail-card">
        <text class="detail-card__title">收货地址</text>
        <view class="detail-address">
          <view class="detail-address__row">
            <text class="detail-address__label">联系人</text>
            <text class="detail-address__value">{{ orderAddress?.contact_name || '--' }}</text>
          </view>
          <view class="detail-address__row">
            <text class="detail-address__label">联系电话</text>
            <text class="detail-address__value">{{ orderAddress?.contact_phone || '--' }}</text>
          </view>
          <view class="detail-address__row">
            <text class="detail-address__label">收货地址</text>
            <text class="detail-address__value">{{ fullAddressText || '--' }}</text>
          </view>
          <view v-if="orderAddress?.postal_code" class="detail-address__row">
            <text class="detail-address__label">邮政编码</text>
            <text class="detail-address__value">{{ orderAddress.postal_code }}</text>
          </view>
        </view>
      </view>

      <view class="detail-card">
        <text class="detail-card__title">物流轨迹</text>
        <view class="detail-timeline">
          <view :class="['timeline-item', { active: isTimelineActive('created') }]">
            <view class="timeline-item__dot"></view>
            <view class="timeline-item__content">
              <text class="timeline-item__title">{{ timelineLabels.created.title }}</text>
              <text class="timeline-item__time">{{ createdAtText }}</text>
              <text class="timeline-item__desc">{{ timelineLabels.created.desc }}</text>
            </view>
          </view>
          <view v-if="isTimelineActive('paid')" :class="['timeline-item', { active: isTimelineActive('paid') }]">
            <view class="timeline-item__dot"></view>
            <view class="timeline-item__content">
              <text class="timeline-item__title">{{ timelineLabels.paid.title }}</text>
              <text v-if="order.paid_at" class="timeline-item__time">{{ formatDateTime(order.paid_at) }}</text>
              <text class="timeline-item__desc">{{ timelineLabels.paid.desc }}</text>
            </view>
          </view>
          <view v-if="isTimelineActive('shipped')" :class="['timeline-item', { active: isTimelineActive('shipped') }]">
            <view class="timeline-item__dot"></view>
            <view class="timeline-item__content">
              <text class="timeline-item__title">{{ timelineLabels.shipped.title }}</text>
              <text v-if="order.shipment_status === 'shipped'" class="timeline-item__time">待收货</text>
              <text class="timeline-item__desc">{{ timelineLabels.shipped.desc }}</text>
            </view>
          </view>
          <view v-if="isTimelineActive('signed')" :class="['timeline-item', { active: isTimelineActive('signed') }]">
            <view class="timeline-item__dot"></view>
            <view class="timeline-item__content">
              <text class="timeline-item__title">{{ timelineLabels.signed.title }}</text>
              <text class="timeline-item__desc">{{ timelineLabels.signed.desc }}</text>
            </view>
          </view>
          <view v-if="isTimelineActive('completed')" :class="['timeline-item', { active: isTimelineActive('completed') }]">
            <view class="timeline-item__dot"></view>
            <view class="timeline-item__content">
              <text class="timeline-item__title">{{ timelineLabels.completed.title }}</text>
              <text class="timeline-item__desc">{{ timelineLabels.completed.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="order.status === 'pending'" class="detail-footer">
        <button class="detail-cancel-button" :loading="isCancelling" @tap="handleCancel">取消订单</button>
        <button class="detail-pay-button" :loading="isPaying" @tap="handlePay">继续支付</button>
      </view>

      <view v-else-if="isAfterSale" class="detail-footer">
        <button v-if="activeAfterSale && activeAfterSale.can_cancel !== false" class="detail-action-btn detail-action-btn--after-sale" @tap="handleCancelAfterSale">{{ cancelAfterSaleLoading ? '取消中...' : '取消售后' }}</button>
        <button class="detail-action-btn detail-action-btn--service" open-type="contact">咨询客服</button>
        <button v-if="showLogistics" class="detail-action-btn detail-action-btn--logistics" @tap="handleViewLogistics">查看物流</button>
      </view>

      <view v-else-if="!afterSaleLoading && order.status !== 'cancelled' && order.status !== 'after_sale_closed' && order.status !== 'refund_closed' && order.status !== 'refunding' && order.status !== 'refund' && order.status !== 'after_sale' && isOrderEligibleForAfterSale" class="detail-footer">
        <button class="detail-action-btn detail-action-btn--after-sale" @tap="handleApplyAfterSale">申请售后</button>
        <button class="detail-action-btn detail-action-btn--service" open-type="contact">咨询客服</button>
        <button v-if="showLogistics" class="detail-action-btn detail-action-btn--logistics" @tap="handleViewLogistics">查看物流</button>
      </view>

      <view v-else class="detail-footer">
        <button class="detail-action-btn detail-action-btn--service" open-type="contact">咨询客服</button>
      </view>
    </view>

    <view v-if="showTrackingPanel" class="tracking-overlay" @tap="closeTrackingPanel">
      <view class="tracking-panel" @tap.stop>
        <view class="tracking-panel__header">
          <view class="tracking-panel__header-bar"></view>
          <text class="tracking-panel__title">物流详情</text>
          <view class="tracking-panel__close" @tap="closeTrackingPanel">
            <text class="tracking-panel__close-icon">✕</text>
          </view>
        </view>

        <view v-if="isTrackingLoading" class="tracking-panel__loading">
          <text class="tracking-panel__loading-icon">⟳</text>
          <text>查询中...</text>
        </view>

        <template v-else-if="trackingData">
          <view class="tracking-hero">
            <view class="tracking-hero__inner">
              <view class="tracking-hero__icon-wrap">
                <text class="tracking-hero__icon">{{ iconLarge }}</text>
              </view>
              <view class="tracking-hero__info">
                <text class="tracking-hero__status">{{ heroStatus }}</text>
                <text class="tracking-hero__hint">{{ heroHint }}</text>
              </view>
            </view>
            <text v-if="estimatedDelivery" class="tracking-hero__eta">{{ estimatedDelivery }}</text>
          </view>

          <view class="tracking-bar">
            <view class="tracking-bar__item">
              <text class="tracking-bar__label">快递公司</text>
              <text class="tracking-bar__value">{{ courierName }}</text>
            </view>
            <view class="tracking-bar__item">
              <text class="tracking-bar__label">快递单号</text>
              <view class="tracking-bar__value-row">
                <text class="tracking-bar__value">{{ trackingData.tracking_no || '--' }}</text>
                <text class="tracking-bar__copy" @tap="onCopyTrackingNo">复制</text>
              </view>
            </view>
            <view v-if="trackingData.courier_phone" class="tracking-bar__item">
              <text class="tracking-bar__label">快递电话</text>
              <text class="tracking-bar__value">{{ trackingData.courier_phone }}</text>
            </view>
            <view v-if="shippedAtText" class="tracking-bar__item">
              <text class="tracking-bar__label">发货时间</text>
              <text class="tracking-bar__value">{{ shippedAtText }}</text>
            </view>
            <view v-if="trackingData.sender_name" class="tracking-bar__item">
              <text class="tracking-bar__label">发件人</text>
              <text class="tracking-bar__value">{{ trackingData.sender_name }}</text>
            </view>
            <view v-if="trackingData.sender_phone" class="tracking-bar__item">
              <text class="tracking-bar__label">发件电话</text>
              <text class="tracking-bar__value">{{ trackingData.sender_phone }}</text>
            </view>
            <view v-if="trackingData.recipient_name || orderAddress?.contact_name" class="tracking-bar__item">
              <text class="tracking-bar__label">收件人</text>
              <text class="tracking-bar__value">{{ trackingData.recipient_name || orderAddress?.contact_name || '--' }}</text>
            </view>
            <view v-if="trackingData.receipt_info" class="tracking-bar__item">
              <text class="tracking-bar__label">签收信息</text>
              <text class="tracking-bar__value tracking-bar__value--receipt">{{ trackingData.receipt_info }}</text>
            </view>
            <view v-if="trackingData.origin_location" class="tracking-bar__item">
              <text class="tracking-bar__label">发货地</text>
              <text class="tracking-bar__value">{{ trackingData.origin_location }}</text>
            </view>
            <view v-if="trackingData.dest_location" class="tracking-bar__item">
              <text class="tracking-bar__label">目的地</text>
              <text class="tracking-bar__value">{{ trackingData.dest_location }}</text>
            </view>
            <view v-if="trackingData.package_weight" class="tracking-bar__item">
              <text class="tracking-bar__label">包裹重量</text>
              <text class="tracking-bar__value">{{ trackingData.package_weight }}</text>
            </view>
          </view>

          <view v-if="trackingTraces.length > 0" class="tracking-timeline">
            <view class="tracking-timeline__header">
              <text class="tracking-timeline__title">物流轨迹</text>
              <text class="tracking-timeline__count">共{{ trackingTraces.length }}条</text>
            </view>
            <view class="tracking-timeline__list">
              <view v-for="(trace, idx) in trackingTraces" :key="idx" :class="['tracking-trace', { 'tracking-trace--latest': idx === 0 }]">
                <view class="tracking-trace__left">
                  <view :class="['tracking-trace__dot', trace.dotClass]">
                    <text v-if="trace.icon" class="tracking-trace__dot-icon">{{ trace.icon }}</text>
                  </view>
                  <view v-if="idx < trackingTraces.length - 1" class="tracking-trace__line"></view>
                </view>
                <view class="tracking-trace__right">
                  <view class="tracking-trace__header">
                    <text class="tracking-trace__status">{{ trace.statusText }}</text>
                    <text v-if="trace.scan_type" class="tracking-trace__tag">{{ trace.scan_type }}</text>
                    <text v-if="trace.action_code" class="tracking-trace__tag tracking-trace__tag--code">{{ trace.action_code }}</text>
                  </view>
                  <text class="tracking-trace__time">{{ trace.timeText }}</text>
                  <text v-if="trace.addressText" class="tracking-trace__address">{{ trace.addressText }}</text>
                  <view v-if="trace.courier_name || trace.courier_phone || trace.related_name || trace.related_phone" class="tracking-trace__meta">
                    <text v-if="trace.courier_name" class="tracking-trace__courier">快递员：{{ trace.courier_name }}</text>
                    <text v-if="trace.courier_phone" class="tracking-trace__phone" @tap="onCallPhone(trace.courier_phone)">{{ trace.courier_phone }}</text>
                    <text v-if="trace.related_name" class="tracking-trace__person">{{ trace.related_name }}</text>
                    <text v-if="trace.related_phone" class="tracking-trace__phone" @tap="onCallPhone(trace.related_phone)">{{ trace.related_phone }}</text>
                  </view>
                  <view v-if="trace.operator || trace.station || trace.facility" class="tracking-trace__meta">
                    <text v-if="trace.operator" class="tracking-trace__courier">操作员：{{ trace.operator }}</text>
                    <text v-if="trace.station" class="tracking-trace__person">网点：{{ trace.station }}</text>
                    <text v-if="trace.facility" class="tracking-trace__person">站点：{{ trace.facility }}</text>
                  </view>
                  <text v-if="trace.remark && trace.remark !== trace.statusText" class="tracking-trace__remark">备注：{{ trace.remark }}</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="!trackingTraces.length && !trackingData.is_signed" class="tracking-panel__empty">
            <text class="tracking-panel__empty-icon">📦</text>
            <text class="tracking-panel__empty-title">等待揽收</text>
            <text class="tracking-panel__empty-desc">包裹已交付快递，物流信息即将更新</text>
          </view>
        </template>

        <view v-else class="tracking-panel__empty">
          <text class="tracking-panel__empty-icon">⚠</text>
          <text>获取物流信息失败</text>
        </view>
      </view>
    </view>

    <!-- 申请售后弹窗 -->
    <view v-if="showAfterSaleModal" class="tracking-overlay" @tap="closeAfterSaleModal">
      <view class="tracking-panel" @tap.stop>
        <view class="tracking-panel__header">
          <view class="tracking-panel__header-bar"></view>
          <text class="tracking-panel__title">申请售后</text>
          <view class="tracking-panel__close" @tap="closeAfterSaleModal">
            <text class="tracking-panel__close-icon">✕</text>
          </view>
        </view>

        <view class="aftersale-body">
          <!-- 售后类型 -->
          <text class="aftersale-label">售后类型</text>
          <view class="aftersale-type-row">
            <view
              v-for="t in afterSaleTypeOptions"
              :key="t.value"
              :class="['aftersale-type-item', { 'aftersale-type-item--active': afterSaleForm.request_type === t.value, 'aftersale-type-item--disabled': t.disabled }]"
              @tap="t.disabled ? null : selectAfterSaleType(t.value)"
            >
              <text>{{ t.label }}</text>
            </view>
          </view>
          <text v-if="afterSaleTypeHint" class="aftersale-hint">{{ afterSaleTypeHint }}</text>

          <!-- 商品选择 -->
          <text class="aftersale-label">售后商品</text>
          <view class="aftersale-items">
            <view v-for="item in orderItems" :key="item.id" class="aftersale-item">
              <image v-if="item.product_image" class="aftersale-item__img" :src="item.product_image" mode="aspectFill" />
              <view v-else class="aftersale-item__img aftersale-item__img--empty"></view>
              <view class="aftersale-item__info">
                <text class="aftersale-item__name">{{ item.product_name }}</text>
                <text class="aftersale-item__price">¥{{ formatItemPrice(item.unit_price) }} × {{ item.quantity }}</text>
              </view>
              <view class="aftersale-item__qty">
                <view class="aftersale-item__qty-btn" @tap="decreaseAfterItem(item)">−</view>
                <text class="aftersale-item__qty-num">{{ getAfterItemQty(item) }}</text>
                <view class="aftersale-item__qty-btn" @tap="increaseAfterItem(item)">+</view>
              </view>
            </view>
          </view>
          <text v-if="!hasSelectedAfterItems" class="aftersale-hint aftersale-hint--warn">请至少选择一件商品</text>

          <!-- 售后原因 -->
          <text class="aftersale-label">售后原因</text>
          <view class="aftersale-reasons">
            <view
              v-for="r in afterSaleReasonOptions"
              :key="r.value"
              :class="['aftersale-reason-tag', { 'aftersale-reason-tag--active': afterSaleForm.reason === r.value }]"
              @tap="afterSaleForm.reason === r.value ? afterSaleForm.reason = '' : afterSaleForm.reason = r.value"
            >
              <text>{{ r.label }}</text>
            </view>
          </view>
          <textarea
            v-if="afterSaleForm.reason === 'other'"
            class="aftersale-textarea"
            :value="afterSaleForm.customReason"
            placeholder="请描述具体原因（必填）"
            maxlength="2000"
            @input="e => afterSaleForm.customReason = e.detail.value"
          />

          <!-- 凭证图片 -->
          <text class="aftersale-label">凭证图片（选填，最多6张）</text>
          <view class="aftersale-images">
            <view v-for="(img, idx) in afterSaleForm.images" :key="idx" class="aftersale-img-item">
              <image class="aftersale-img" :src="img.path" mode="aspectFill" />
              <view class="aftersale-img-del" @tap="removeAfterImage(idx)">✕</view>
              <view v-if="img.uploading" class="aftersale-img-loading">上传中...</view>
            </view>
            <view
              v-if="afterSaleForm.images.length < 6"
              class="aftersale-img-item aftersale-img-item--add"
              @tap="chooseAfterImage"
            >
              <text class="aftersale-img-add-icon">+</text>
            </view>
          </view>

          <!-- 退款金额预览 -->
          <view v-if="hasSelectedAfterItems" class="aftersale-amount-preview">
            <text class="aftersale-amount-preview__label">预计退款金额</text>
            <text class="aftersale-amount-preview__value">{{ formatPrice(afterSaleEstimatedAmount) }}</text>
          </view>

          <!-- 提交 -->
          <button
            class="aftersale-submit"
            :disabled="!canSubmitAfterSale || afterSaleSubmitting"
            :loading="afterSaleSubmitting"
            @tap="handleSubmitAfterSale"
          >
            {{ afterSaleSubmitting ? '提交中...' : '提交申请' }}
          </button>
        </view>
      </view>
    </view>

    <!-- 填写退货物流弹窗 -->
    <view v-if="showReturnLogisticsModal" class="tracking-overlay" @tap="closeReturnLogisticsModal">
      <view class="tracking-panel" @tap.stop>
        <view class="tracking-panel__header">
          <view class="tracking-panel__header-bar"></view>
          <text class="tracking-panel__title">填写退货物流</text>
          <view class="tracking-panel__close" @tap="closeReturnLogisticsModal">
            <text class="tracking-panel__close-icon">✕</text>
          </view>
        </view>

        <view class="aftersale-body">
          <text class="aftersale-label">快递公司</text>
          <input
            class="aftersale-input"
            :value="returnLogisticsForm.courier_company"
            placeholder="请输入快递公司名称"
            placeholder-class="aftersale-placeholder"
            @input="e => returnLogisticsForm.courier_company = e.detail.value"
          />

          <text class="aftersale-label">快递单号</text>
          <input
            class="aftersale-input"
            :value="returnLogisticsForm.tracking_no"
            placeholder="请输入快递单号"
            placeholder-class="aftersale-placeholder"
            @input="e => returnLogisticsForm.tracking_no = e.detail.value"
          />

          <button
            class="aftersale-submit"
            :disabled="!returnLogisticsForm.courier_company.trim() || !returnLogisticsForm.tracking_no.trim() || returnLogisticsSubmitting"
            :loading="returnLogisticsSubmitting"
            @tap="handleSubmitReturnLogistics"
          >
            {{ returnLogisticsSubmitting ? '提交中...' : '确认提交' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { getCurrentInstance, useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useAppMutation, useAppQuery } from '@/utils/app-query'

import { createOrderPayment, getOrderDetail, listOrders, cancelOrder, getOrderTracking } from '@/api/orders'
import { createAfterSale, uploadEvidenceImage, listAfterSales, cancelAfterSale, updateAfterSaleReturnInfo } from '@/api/after-sales'
import { listSaleProducts } from '@/api/products'

import './index.scss'

const PAYMENT_POLL_INTERVAL = 1500
const PAYMENT_POLL_MAX_ATTEMPTS = 4

function sleep (delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}

function formatPrice (price) {
  const value = Number(price)
  if (Number.isFinite(value)) {
    return `¥${value.toFixed(2)}`
  }
  return '¥--'
}

function formatDateTime (value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const y = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')]
  const t = [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0')]
  return `${y.join('.')} ${t.join(':')}`
}

function getStatusMeta (status, shipmentStatus, isSigned, backendLabel) {
  if (backendLabel && backendLabel.trim()) {
    const label = backendLabel.trim()
    if (status === 'pending') return { label, className: 'is-pending' }
    if (status === 'cancelled' || status === 'closed') return { label, className: 'is-cancelled' }
    if (status === 'completed') return { label: '已完成', className: 'is-paid' }
    if (shipmentStatus === 'received' || isSigned) return { label: '已签收', className: 'is-paid' }
    if (status === 'paid') return { label: '待发货', className: 'is-paid' }
    return { label, className: 'is-paid' }
  }
  if (status === 'after_sale' || status === 'refunding' || status === 'refund') return { label: '售后中', className: 'is-pending' }
  if (status === 'after_sale_closed' || status === 'refund_closed') return { label: '售后关闭', className: 'is-cancelled' }
  if (status === 'completed') return { label: '已完成', className: 'is-paid' }
  if (shipmentStatus === 'received' || isSigned) return { label: '已签收', className: 'is-paid' }
  if (shipmentStatus === 'shipped') return { label: '待收货', className: 'is-paid' }
  if (status === 'paid') return { label: '待发货', className: 'is-paid' }
  if (status === 'pending') return { label: '待处理', className: 'is-pending' }
  if (status === 'processing') return { label: '处理中', className: 'is-paid' }
  if (status === 'cancelled' || status === 'closed') return { label: '已取消', className: 'is-cancelled' }
  return { label: '状态待同步', className: 'is-neutral' }
}

function getOrderTypeLabel (orderType) {
  switch (orderType) {
    case 'sale': return '销售单'
    case 'sample': return '样品单'
    default: return '订单'
  }
}

function formatFullAddress (address) {
  return [address.province, address.city, address.district, address.address_detail].filter(Boolean).join(' ')
}

function buildProductPriceMap (products) {
  const map = {}
  if (!Array.isArray(products)) return map
  products.forEach((p) => {
    if (p?.id != null) {
      const price = Number(p.price || 0)
      map[p.id] = price
      map[String(p.id)] = price
    }
  })
  return map
}

function enrichOrderItems (order, priceMap) {
  if (!order?.items || !Array.isArray(order.items)) return order
  const enrichedItems = order.items.map((it) => {
    const quantity = Number(it.quantity || 0)
    const lineAmount = Number(it.line_amount || 0)
    const unitPrice = Number(it.unit_price || (priceMap[String(it.product_id)] || priceMap[Number(it.product_id)] || 0))

    return {
      ...it,
      unit_price: unitPrice || it.unit_price,
      line_amount: lineAmount || unitPrice * quantity
    }
  })
  return { ...order, items: enrichedItems }
}

function formatItemPrice (price) {
  const value = Number(price)
  if (Number.isFinite(value) && value > 0) {
    return value.toFixed(2)
  }
  return '0.00'
}

function formatItemSubtotal (item) {
  const lineAmount = Number(item?.line_amount || 0)
  if (lineAmount > 0) return lineAmount.toFixed(2)
  const unitPrice = Number(item?.unit_price || 0)
  const quantity = Number(item?.quantity || 0)
  return (unitPrice * quantity).toFixed(2)
}

function getTimelineStep (order) {
  const backend = order?.status
  if (backend === 'cancelled' || backend === 'closed') return 'cancelled'
  if (backend === 'completed') return 'completed'
  if (order?.shipment_status === 'received') return 'signed'
  if (order?.shipment_status === 'shipped') return 'shipped'
  if (backend === 'paid') return 'paid'
  return 'created'
}

function getTimelineDefaultLabels () {
  return {
    created: { title: '订单已创建', desc: '订单已提交，等待付款' },
    paid: { title: '买家已付款', desc: '订单已付款，等待商家发货' },
    shipped: { title: '商家已发货', desc: '包裹运输中，请注意查收' },
    signed: { title: '已签收', desc: '买家已签收，交易完成' },
    completed: { title: '订单已完成', desc: '订单已签收，交易完成' }
  }
}

function translateTrackingState (label) {
  if (!label || typeof label !== 'string') return label
  const map = {
    collecting: '待揽收',
    collected: '已揽收',
    transporting: '运输中',
    delivering: '运输中',
    in_transit: '运输中',
    out_for_delivery: '派送中',
    delivering_to_station: '派送中',
    delivered: '已送达',
    signed: '已签收',
    received: '已签收',
    failed: '异常',
    exception: '异常',
    returning: '退回中',
    returned: '已退回',
    cancelled: '已取消',
    cancel: '已取消',
    pending: '待发货',
    shipping: '运输中',
    shipped: '已发货',
    picked_up: '已揽收',
    departed: '已发出',
    arrived: '已到达',
    in_delivery: '派送中',
    ready_for_pickup: '待取件',
    pickup: '已取件',
    expired: '已过期',
    lost: '丢失',
    rejected: '拒收'
  }
  const key = label.toLowerCase().trim()
  return map[key] || label
}

function formatQueryError (error) {
  const lines = [error?.message || '请稍后重试']
  if (error?.statusCode) lines.push(`status: ${error.statusCode}`)
  if (error?.request?.method && error?.request?.url) {
    lines.push(`${error.request.method.toUpperCase()} ${error.request.url}`)
  }
  return lines.join('\n')
}

function extractAddressFromText () {
  const texts = Array.from(arguments).filter(v => typeof v === 'string' && v.trim())
  if (!texts.length) return ''

  const results = []
  const addrKeywords = /(?:路|道|街|巷|弄|里|号|楼|栋|单元|层|室|房|苑|园|村|庄|小区|广场|大厦|中心|公寓|花园|新城|花苑|家园|大楼|城|坊|桥|坡|营|口|岗|关|台|湖|岛|湾|塘|坝|坪|岭|沟|营业点|分部|网点|集散|中转|分拨|处理中心|速递|物流园)/
  const numberPattern = /\d+/

  // 括号内的内容只要长度够就收集（物流状态中的【】几乎都是地名）
  for (const text of texts) {
    const bracketMatches = text.match(/【(.+?)】/g)
    if (bracketMatches) {
      for (const bm of bracketMatches) {
        const inner = bm.replace(/【|】/g, '').trim()
        if (inner.length >= 3) {
          results.push(inner)
        }
      }
    }
  }

  // 也匹配没有【】但有地址关键词+数字的文本段落
  for (const text of texts) {
    const pattern = new RegExp(
      '(' +
        '(?:[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼](?:省|市|区)?)?' +
        '(?:[^\\s]{1,10}?(?:市|州|盟|地区|区|县|旗))?' +
        '\\s*' +
        '(?:[^\\s]{1,10}?(?:区|镇|乡|街道))?' +
        '\\s*' +
        '[^\\s]{1,20}?' +
        '(?:路|道|街|大道|大街|巷|弄|里)' +
        '\\s*' +
        '[^\\s]{1,15}?' +
        '(?:号|楼|栋|单元|层|室|房|苑|园|村|庄|小区|广场|大厦|中心|营业点|网点|分部|集散|中转)' +
        '\\S{0,50}' +
      ')',
      'g'
    )
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      if (m[1] && m[1].length >= 6 && numberPattern.test(m[1])) {
        results.push(m[1].trim())
      }
    }
  }

  // 路名+数字的宽松匹配
  for (const text of texts) {
    const words = text.split(/[，。,.\s]+/).filter(Boolean)
    for (const word of words) {
      if (word.length >= 5 && addrKeywords.test(word) && numberPattern.test(word)) {
        results.push(word.trim())
      }
    }
  }

  for (const text of texts) {
    const pattern = new RegExp(
      '(' +
        '(?:[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼][省区市])?' +
        '(?:[^\\s]{1,10}?(?:市|州|盟|地区|区|县|旗))?' +
        '\\s*' +
        '[^\\s]{1,15}?' +
        '(?:街道|镇|乡|路|道|街|巷|弄|里|号|楼|栋|单元|层|室|房|苑|园|村|庄)' +
        '\\S{0,30}' +
      ')',
      'g'
    )
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      if (m[1] && m[1].length >= 5 && numberPattern.test(m[1])) {
        results.push(m[1].trim())
      }
    }
  }

  for (const text of texts) {
    const pattern = /(\d+号(?:楼|栋|层|室|房|单元|\s|$)?\S{0,20})/g
    const matches = text.matchAll(pattern)
    for (const m of matches) {
      if (m[1]) results.push(m[1].trim())
    }
  }

  return results.join(' ')
}

function buildDetailAddress (trace) {
  const detailParts = []
  if (trace.address_detail) detailParts.push(trace.address_detail)
  if (trace.detail) detailParts.push(trace.detail)
  if (trace.house_number || trace.house_no) detailParts.push(trace.house_number || trace.house_no)
  if (trace.building || trace.building_no) detailParts.push(trace.building || trace.building_no)
  if (trace.door_no) detailParts.push(trace.door_no)
  if (trace.floor) detailParts.push(trace.floor)
  if (trace.room) detailParts.push(trace.room)
  if (trace.unit) detailParts.push(trace.unit)
  return detailParts.join(' ')
}

export default {
  setup () {
    const DEBUG_AFTERSALE = false
    const orderId = ref('')
    const isPaying = ref(false)
    const isCancelling = ref(false)

    const showTrackingPanel = ref(false)
    const trackingData = ref(null)
    const isTrackingLoading = ref(false)

    // ---- 售后数据 ----
    const afterSaleRecords = ref([])
    const afterSaleLoading = ref(false)
    const cancelAfterSaleLoading = ref(false)

    async function fetchAfterSales (orderId) {
      if (!orderId) return
      afterSaleLoading.value = true
      afterSaleRecords.value = [] // 切换订单时先清空旧数据
      try {
        const records = await listAfterSales({ order_id: orderId })
        // 客户端双重过滤，确保只有当前订单的售后记录
        afterSaleRecords.value = (Array.isArray(records) ? records : [])
          .filter(r => String(r.order_id || r.order) === String(orderId))
        console.log('[aftersale] fetched records:', afterSaleRecords.value.length, 'for order:', orderId)
      } catch (e) {
        console.warn('[aftersale] fetch failed:', e?.message)
        afterSaleRecords.value = []
      } finally {
        afterSaleLoading.value = false
      }
    }

    // ---- 调试：注入测试售后数据 ----
    function injectTestAfterSales (orderId) {
      const mockAfterSales = [
        {
          id: 'test-return-1',
          request_id: 'test-return-1',
          order_id: orderId,
          status: 'approved_waiting_refund',
          request_type: 'return',
          reason: '不想要了',
          requested_amount: '59.80',
          applied_at: new Date(Date.now() - 3600000).toISOString(),
          evidence: [],
          can_cancel: true,
          timeline: [
            { status: 'approved', created_at: new Date().toISOString() },
            { status: 'applied', created_at: new Date(Date.now() - 3600000).toISOString() }
          ]
        },
        {
          id: 'test-active-1',
          request_id: 'test-active-1',
          order_id: orderId,
          status: 'applied',
          request_type: 'refund',
          reason: '商品破损',
          requested_amount: '29.90',
          applied_at: new Date().toISOString(),
          evidence: [],
          can_cancel: true,
          timeline: [
            { status: 'applied', created_at: new Date().toISOString() }
          ]
        },
        {
          id: 'test-rejected-1',
          request_id: 'test-rejected-1',
          order_id: orderId,
          status: 'rejected',
          request_type: 'refund',
          reason: '质量问题',
          requested_amount: '39.90',
          applied_at: new Date(Date.now() - 7200000).toISOString(),
          rejected_at: new Date(Date.now() - 3600000).toISOString(),
          reject_reason: '经审核，商品不存在质量问题，您的申请已被驳回',
          evidence: [],
          timeline: [
            { status: 'rejected', created_at: new Date(Date.now() - 3600000).toISOString(), note: '经审核，商品不存在质量问题' },
            { status: 'applied', created_at: new Date(Date.now() - 7200000).toISOString() }
          ]
        },
        {
          id: 'test-completed-1',
          request_id: 'test-completed-1',
          order_id: orderId,
          status: 'completed',
          request_type: 'refund',
          reason: '发错货',
          requested_amount: '19.90',
          applied_at: new Date(Date.now() - 86400000).toISOString(),
          completed_at: new Date(Date.now() - 43200000).toISOString(),
          evidence: [],
          timeline: [
            { status: 'completed', created_at: new Date(Date.now() - 43200000).toISOString() },
            { status: 'approved', created_at: new Date(Date.now() - 64800000).toISOString() },
            { status: 'applied', created_at: new Date(Date.now() - 86400000).toISOString() }
          ]
        }
      ]
      afterSaleRecords.value = [...mockAfterSales]
      console.log('[DEBUG aftersale] injected test records:', mockAfterSales.length)
    }

    // ---- 退货物流填写 ----
    const showReturnLogisticsModal = ref(false)
    const returnLogisticsForm = ref({ courier_company: '', tracking_no: '' })
    const returnLogisticsSubmitting = ref(false)

    const showReturnLogisticsButton = computed(() => {
      const r = activeAfterSale.value
      if (!r) return false
      const type = (r.request_type || '').toLowerCase()
      if (type !== 'return' && type !== 'return_refund') return false
      const s = (r.status || r.request_status || '').toLowerCase()
      return s === 'approved' || s === 'approved_waiting_refund'
    })

    const hasReturnLogisticsInfo = computed(() => {
      const r = activeAfterSale.value
      if (!r) return false
      return !!(r.return_courier_company || r.return_tracking_no)
    })

    function openReturnLogisticsModal () {
      returnLogisticsForm.value = { courier_company: '', tracking_no: '' }
      showReturnLogisticsModal.value = true
    }

    function closeReturnLogisticsModal () {
      showReturnLogisticsModal.value = false
    }

    async function handleSubmitReturnLogistics () {
      const r = activeAfterSale.value
      if (!r) return
      const requestId = r.request_id || r.id
      const form = returnLogisticsForm.value
      if (!form.courier_company.trim() || !form.tracking_no.trim()) {
        Taro.showToast({ title: '请填写完整物流信息', icon: 'none' })
        return
      }

      returnLogisticsSubmitting.value = true
      try {
        await updateAfterSaleReturnInfo(requestId, {
          return_courier_company: form.courier_company.trim(),
          return_tracking_no: form.tracking_no.trim()
        })
        Taro.showToast({ title: '退货物流已提交', icon: 'success' })
        showReturnLogisticsModal.value = false
        await fetchAfterSales(order.value?.id)
      } catch (err) {
        console.error('[aftersale] submit return logistics failed:', err)
        Taro.showToast({ title: err?.message || '提交失败，请重试', icon: 'none' })
      } finally {
        returnLogisticsSubmitting.value = false
      }
    }

    function copyReturnTrackingNo () {
      const no = activeAfterSale.value?.return_tracking_no
      if (!no) return
      Taro.setClipboardData({
        data: String(no),
        success: () => {
          Taro.showToast({ title: '已复制快递单号', icon: 'success' })
        }
      })
    }

    // ---- 售后申请 ----
    const showAfterSaleModal = ref(false)
    const afterSaleSubmitting = ref(false)
    const afterSaleForm = ref({
      request_type: '',
      reason: '',
      images: [] // { path, uploadId, uploading }
    })

    const trackingSigned = computed(() => {
      const label = trackingData.value?.state_label
      if (trackingData.value?.is_signed || label === 'signed' || label === 'delivered') {
        return true
      }
      if (trackingData.value?.traces && trackingData.value.traces.length > 0) {
        const latest = trackingData.value.traces[0]
        const text = (latest.status || latest.context || latest.desc || latest.remark || '').toLowerCase()
        if (text.includes('签收') || text.includes('已签收') || text.includes('代签收') || text.includes('门卫') || text.includes('前台') || text.includes('快递柜') || text.includes('驿站')) {
          return true
        }
      }
      return false
    })

    function fetchTrackingIfNeeded (orderData) {
      if (orderData?.id && (orderData.shipment_status === 'shipped' || orderData.shipment_status === 'received' || orderData.status === 'completed')) {
        // #region debug-point tracking-fetch
        console.log('[DEBUG order-ship-sign-flow] fetchTrackingIfNeeded triggered:', {
          orderId: orderData.id,
          shipment_status: orderData.shipment_status,
          order_status: orderData.status
        })
        // #endregion debug-point tracking-fetch
        getOrderTracking(orderData.id).then(data => {
          // #region debug-point tracking-data
          console.log('[DEBUG order-ship-sign-flow] tracking data:', {
            state_label: data.state_label,
            status_label: data.status_label,
            is_signed: data.is_signed,
            traces_count: data.traces?.length || 0,
            courier_company: data.courier_company
          })
          // #endregion debug-point tracking-data
          trackingData.value = data
        }).catch(() => {})
      }
    }

    const {
      data: order,
      isLoading,
      isFetching,
      isError,
      error,
      refetch
    } = useAppQuery({
      queryKey: computed(() => ['orders', 'detail', orderId.value]),
      queryFn: async () => {
        const products = await listSaleProducts().catch(() => [])
        const priceMap = buildProductPriceMap(products)

        let detail
        try {
          detail = await getOrderDetail(orderId.value)
          detail = enrichOrderItems(detail, priceMap)
        } catch {
          const list = await listOrders()
          if (Array.isArray(list)) {
            const found = list.find((item) => String(item?.id) === String(orderId.value)) || null
            detail = found ? enrichOrderItems(found, priceMap) : null
          } else {
            detail = null
          }
        }

        if (detail) {
          // #region debug-point order-load
          console.log('[DEBUG order-ship-sign-flow] order loaded:', {
            id: detail.id,
            status: detail.status,
            status_label: detail.status_label,
            shipment_status: detail.shipment_status,
            order_no: detail.order_no,
            order_type: detail.order_type
          })
          // #endregion debug-point order-load
          fetchTrackingIfNeeded(detail)
          await fetchAfterSales(detail.id)
          if (DEBUG_AFTERSALE) { injectTestAfterSales(detail.id) }
        }
        return detail
      },
      enabled: computed(() => Boolean(orderId.value))
    })

    const errorMessage = computed(() => formatQueryError(error.value))
    const createdAtText = computed(() => formatDateTime(order.value?.created_at))
    const statusMeta = computed(() => {
      // 优先显示售后状态
      if (activeAfterSale.value) {
        return { label: '售后中', className: 'is-pending' }
      }
      const backendLabel = order.value?.status_label
        || order.value?.status_display
        || order.value?.display_status
        || order.value?.shipment_status_label
        || ''
      const meta = getStatusMeta(order.value?.status, order.value?.shipment_status, trackingSigned.value, backendLabel)
      return meta
    })
    const orderTypeLabel = computed(() => getOrderTypeLabel(order.value?.order_type))
    const orderItems = computed(() => (Array.isArray(order.value?.items) ? order.value.items : []))
    const orderAddress = computed(() => order.value?.address || null)
    const fullAddressText = computed(() => orderAddress.value ? formatFullAddress(orderAddress.value) : '')

    const hasShipmentStatus = computed(() => {
      const s = order.value?.shipment_status
      const statusLabel = order.value?.status_label || order.value?.status_display || order.value?.display_status || ''
      return s === 'shipped' || s === 'delivered' || s === 'completed'
        || trackingSigned.value
        || !!statusLabel
    })

    const timelineStep = computed(() => {
      const step = trackingSigned.value ? 'signed' : getTimelineStep(order.value)
      // #region debug-point timeline-step
      console.log('[DEBUG order-ship-sign-flow] timelineStep:', {
        order_status: order.value?.status,
        shipment_status: order.value?.shipment_status,
        tracking_signed: trackingSigned.value,
        step
      })
      // #endregion debug-point timeline-step
      return step
    })

    const showLogistics = computed(() => {
      if (trackingData.value) return true
      const s = order.value?.shipment_status
      const status = order.value?.status
      return s === 'shipped' || s === 'delivered' || s === 'received' || status === 'completed' || trackingSigned.value
    })

    const isAfterSale = computed(() => {
      return !!activeAfterSale.value
    })

    const isOrderEligibleForAfterSale = computed(() => {
      const status = order.value?.status
      const s = order.value?.shipment_status
      // 待发货(paid未发货) / 运输中(shipped) / 已签收(received) / 已完成(completed) 均可售后
      if (status === 'paid') return true
      if (s === 'shipped' || s === 'received' || s === 'delivered' || status === 'completed') return true
      return false
    })

    const activeAfterSale = computed(() => {
      const records = afterSaleRecords.value
      if (!records.length) return null
      return records.find(r => {
        const s = (r.status || r.request_status || r.state || r.request_state || '').toLowerCase()
        const isTerminal = s === 'cancelled' || s === 'canceled' || s === 'cancelled_by_customer' || s === 'closed' || s === 'completed' || s === 'finished' || s === 'rejected'
        const hasEndTime = r.cancelled_at || r.closed_at || r.refunded_at
        return !isTerminal && !hasEndTime
      }) || null
    })

    const rejectedAfterSale = computed(() => {
      if (activeAfterSale.value) return null // 有活跃的优先展示活跃
      const records = afterSaleRecords.value
      if (!records.length) return null
      return records.find(r => {
        const s = (r.status || r.request_status || '').toLowerCase()
        return s === 'rejected'
      }) || null
    })

    const completedAfterSale = computed(() => {
      if (activeAfterSale.value || rejectedAfterSale.value) return null
      const records = afterSaleRecords.value
      if (!records.length) return null
      return records.find(r => {
        const s = (r.status || r.request_status || '').toLowerCase()
        return s === 'completed' || s === 'finished' || s === 'refunded'
      }) || null
    })

    const cancelledAfterSale = computed(() => {
      if (activeAfterSale.value || rejectedAfterSale.value || completedAfterSale.value) return null
      const records = afterSaleRecords.value
      if (!records.length) return null
      return records.find(r => {
        const s = (r.status || r.request_status || '').toLowerCase()
        return s === 'cancelled' || s === 'canceled' || s === 'cancelled_by_customer' || s === 'closed'
      }) || null
    })

    const displayAfterSale = computed(() => activeAfterSale.value || rejectedAfterSale.value || completedAfterSale.value || cancelledAfterSale.value)

    const afterSaleStatusText = computed(() => {
      const r = displayAfterSale.value
      if (!r) return ''
      const statusMap = {
        pending: '待审核',
        submitted: '已提交',
        applied: '已申请',
        processing: '处理中',
        reviewing: '审核中',
        approved: '已通过',
        approved_waiting_refund: '等待退款',
        rejected: '已拒绝',
        completed: '已完成',
        finished: '已完成',
        cancelled: '已取消',
        canceled: '已取消',
        cancelled_by_customer: '已取消',
        closed: '已关闭',
        refunding: '退款中',
        refunded: '已退款',
        returned: '已退货'
      }
      const s = (r.status || r.request_status || r.state || r.request_state || '').toLowerCase()
      return statusMap[s] || '处理中'
    })

    const afterSaleTypeLabel = computed(() => {
      const t = (displayAfterSale.value?.request_type || '').toLowerCase()
      const map = { refund: '仅退款', refund_only: '仅退款', return: '退货退款', return_refund: '退货退款', exchange: '换货' }
      return map[t] || '售后'
    })

    const rejectReason = computed(() => {
      const r = displayAfterSale.value
      if (!r) return ''
      const s = (r.status || r.request_status || '').toLowerCase()
      if (s !== 'rejected') return ''
      return r.reject_reason || r.rejection_reason || r.rejected_reason
        || r.review_comment || r.reject_message || r.decline_reason
        || r.remark || r.admin_note || ''
    })

    const afterSaleEvidence = computed(() => {
      const r = displayAfterSale.value
      if (!r) return []
      const evidence = r.evidence
      if (Array.isArray(evidence)) return evidence
      return []
    })

    const afterSaleTimeline = computed(() => {
      const r = displayAfterSale.value
      if (!r) return []
      const timeline = r.timeline
      if (!Array.isArray(timeline) || !timeline.length) return []
      return timeline.map(entry => {
        const statusMap = {
          applied: '提交申请', pending: '提交申请', submitted: '已提交',
          processing: '审核处理', reviewing: '审核中',
          approved: '审核通过', approved_waiting_refund: '等待退款',
          rejected: '审核拒绝', cancelled: '已取消', canceled: '已取消', cancelled_by_customer: '已取消',
          closed: '已关闭', completed: '已完成', finished: '已完成',
          refunding: '退款中', refunded: '已退款', returned: '已退货'
        }
        const s = (entry.status || entry.action || '').toLowerCase()
        const title = statusMap[s] || entry.title || entry.status || entry.action || '状态更新'
        const time = entry.created_at || entry.time || entry.updated_at || ''
        const desc = entry.note || entry.remark || entry.description || entry.comment || ''
        return {
          title,
          time: time ? formatDateTime(time) : '',
          desc
        }
      })
    })

    function previewEvidence (idx) {
      const urls = afterSaleEvidence.value.map(img => img.url || img)
      if (!urls.length) return
      Taro.previewImage({
        current: urls[idx],
        urls
      })
    }

    const afterSaleSteps = computed(() => {
      const r = displayAfterSale.value
      if (!r) return []
      const s = (r.status || r.request_status || r.state || r.request_state || '').toLowerCase()
      const type = (r.request_type || '').toLowerCase()
      const isReturn = type === 'return' || type === 'return_refund'

      if (isReturn) {
        // 退货退款：4步
        const steps = [
          { key: 'submit', label: '提交申请', done: false, active: false },
          { key: 'approve', label: '审核通过', done: false, active: false },
          { key: 'return', label: '买家退货', done: false, active: false },
          { key: 'finish', label: '退款到账', done: false, active: false }
        ]
        const levelMap = {
          pending: 0, submitted: 0, applied: 0,
          processing: 1, reviewing: 1,
          approved: 1, approved_waiting_refund: 1,
          refunding: 2, returned: 2,
          completed: 3, finished: 3, refunded: 3
        }
        const currentLevel = levelMap[s]
        if (currentLevel === undefined) {
          if (s === 'rejected') {
            steps[0].done = true
            steps[1].label = '已拒绝'
            steps[1].active = true
          } else if (s === 'cancelled' || s === 'canceled' || s === 'cancelled_by_customer' || s === 'closed') {
            steps[0].done = true
            steps[1].label = '已关闭'
            steps[1].active = true
          } else {
            steps[0].active = true
          }
          return steps
        }
        for (let i = 0; i < steps.length; i++) {
          if (i < currentLevel) steps[i].done = true
          else if (i === currentLevel) steps[i].active = true
        }
        if (currentLevel >= 3) steps[3].done = true
        return steps
      }

      // 仅退款：3步
      const steps = [
        { key: 'submit', label: '提交申请', done: false, active: false },
        { key: 'review', label: '审核处理', done: false, active: false },
        { key: 'finish', label: '售后完成', done: false, active: false }
      ]
      // 状态 → 当前步骤索引：0=提交, 1=审核, 2=完成
      const levelMap = {
        pending: 0, submitted: 0, applied: 0,
        processing: 1, reviewing: 1,
        approved: 1, approved_waiting_refund: 1,
        completed: 2, finished: 2,
        refunding: 1, refunded: 2, returned: 2
      }
      const currentLevel = levelMap[s]
      if (currentLevel === undefined) {
        // 拒绝/取消等异常状态
        if (s === 'rejected') {
          steps[0].done = true
          steps[1].label = '已拒绝'
          steps[1].active = true
        } else if (s === 'cancelled' || s === 'canceled' || s === 'cancelled_by_customer' || s === 'closed') {
          steps[0].done = true
          steps[1].label = '已关闭'
          steps[1].active = true
        } else {
          steps[0].active = true
        }
        return steps
      }
      // 正常流转：完成之前的所有步骤标记 done，当前步骤标记 active
      for (let i = 0; i < steps.length; i++) {
        if (i < currentLevel) steps[i].done = true
        else if (i === currentLevel) steps[i].active = true
      }
      // 完成了也全部点亮
      if (currentLevel >= 2) {
        steps[2].done = true
      }
      return steps
    })

    const timelineLabels = computed(() => {
      const defaults = getTimelineDefaultLabels()
      const o = order.value || {}
      const label = o.status_label || o.status_display || o.display_status || ''
      const shipmentLabel = o.shipment_status_label || o.shipment_status_display || ''

      return {
        created: {
          title: label || defaults.created.title,
          desc: o.created_desc || o.status_desc || defaults.created.desc
        },
        paid: {
          title: defaults.paid.title,
          desc: o.paid_desc || defaults.paid.desc
        },
        shipped: {
          title: shipmentLabel || label || defaults.shipped.title,
          desc: o.shipped_desc || defaults.shipped.desc
        },
        signed: {
          title: trackingSigned.value ? translateTrackingState(trackingData.value?.state_label || trackingData.value?.status_label || '已签收') : (label || defaults.signed.title),
          desc: o.signed_desc || defaults.signed.desc
        },
        completed: {
          title: label || defaults.completed.title,
          desc: o.completed_desc || defaults.completed.desc
        }
      }
    })

    const trackingTraces = computed(() => {
      if (!trackingData.value?.traces) return []
      const list = [...trackingData.value.traces].reverse()
      // #region debug-point tracking-traces
      console.log('[DEBUG order-ship-sign-flow] trackingTraces parsed:', {
        count: list.length,
        latest_status: list[0]?.status || list[0]?.context || '',
        icons: list.slice(0, 3).map(t => iconForStateLabel(t.status || t.context || ''))
      })
      // #endregion debug-point tracking-traces
      return list.map((t, i) => {
        const isLatest = i === 0
        let dotClass = ''
        let icon = ''
        if (isLatest) {
          dotClass = 'tracking-trace__dot--active'
          icon = '📍'
        } else if (i === list.length - 1) {
          dotClass = 'tracking-trace__dot--start'
          icon = '📦'
        }
        const statusText = t.status || t.context || t.desc || t.remark || ''
        const timeText = t.time || t.ftime || ''

        let addressText = ''

        const structParts = []
        if (t.province) structParts.push(t.province)
        if (t.city) structParts.push(t.city)
        if (t.district) structParts.push(t.district)
        if (t.street) structParts.push(t.street)
        if (t.area_name) structParts.push(t.area_name)
        if (t.area_center) structParts.push(t.area_center)
        const structAddr = structParts.join('')

        if (t.address && typeof t.address === 'string' && t.address.trim().length >= 5) {
          addressText = t.address.trim()
        } else if (t.addr && typeof t.addr === 'string' && t.addr.trim().length >= 5) {
          addressText = t.addr.trim()
        } else if (t.location && typeof t.location === 'string' && t.location.trim().length >= 5) {
          addressText = t.location.trim()
        } else if (t.area_detail && typeof t.area_detail === 'string' && t.area_detail.trim().length >= 5) {
          addressText = t.area_detail.trim()
        }

        if (structAddr && !addressText.includes(structAddr)) {
          addressText = addressText ? structAddr + ' ' + addressText : structAddr
        }

        const detail = buildDetailAddress(t)
        if (detail && !addressText.includes(detail)) {
          addressText = addressText ? addressText + ' ' + detail : detail
        }

        if (!addressText) {
          addressText = structAddr
        }

        const extractedDetail = extractAddressFromText(
          statusText,
          t.context || '',
          t.desc || '',
          t.remark || '',
          t.address || '',
          t.addr || '',
          t.location || '',
          t.area_name || '',
          t.area_center || '',
          t.street || '',
          t.station || '',
          t.facility || '',
          t.area_detail || ''
        )
        if (extractedDetail) {
          const pieces = extractedDetail.split(/\s+/).filter(Boolean)
          for (const piece of pieces) {
            if (!addressText.includes(piece)) {
              addressText = addressText ? addressText + ' ' + piece : piece
            }
          }
        }

        if (!/\d/.test(addressText) && statusText && statusText.length >= 4) {
          const extraFromStatus = extractAddressFromText(statusText)
          if (extraFromStatus) {
            const pieces = extraFromStatus.split(/\s+/).filter(Boolean)
            for (const piece of pieces) {
              if (!addressText.includes(piece)) {
                addressText = addressText ? addressText + ' ' + piece : piece
              }
            }
          }
          if (!/\d/.test(addressText)) {
            addressText = addressText ? addressText + ' | ' + statusText : statusText
          }
        }

        return {
          ...t,
          dotClass,
          icon,
          statusText,
          timeText,
          addressText,
          actionCode: t.action_code || t.opcode || t.code || '',
          courierPhone: t.courier_phone || '',
          operator: t.operator || t.operator_name || t.handler || '',
          station: t.station || t.station_name || t.branch || '',
          facility: t.facility || t.facility_name || t.hub || t.warehouse || '',
          remark: t.remark || t.note || t.comment || ''
        }
      })
    })

    function iconForStateLabel (label) {
      if (!label) return '📝'
      const s = label.toLowerCase()
      if (s.includes('签收') || s.includes('送达') || s.includes('完成')) return '🎯'
      if (s.includes('派送') || s.includes('配送')) return '🚲'
      if (s.includes('运输') || s.includes('中转') || s.includes('发往') || s.includes('到达') || s.includes('离开')) return '✈️'
      if (s.includes('揽收') || s.includes('取件') || s.includes('收件')) return '📥'
      if (s.includes('待取') || s.includes('待揽') || s.includes('下单')) return '📝'
      if (s.includes('退回') || s.includes('退件')) return '⏪'
      if (s.includes('异常') || s.includes('滞留') || s.includes('失败') || s.includes('问题件')) return '🔴'
      if (s.includes('取消')) return '⛔'
      return '✈️'
    }

    const iconLarge = computed(() => {
      const label = trackingData.value?.state_label
        || trackingData.value?.status_label
        || trackingData.value?.status
        || ''
      return iconForStateLabel(label)
    })

    const heroStatus = computed(() => {
      if (!trackingData.value) return ''
      const raw = trackingData.value?.state_label
        || trackingData.value?.status_label
        || trackingData.value?.status
        || '运输中'
      return translateTrackingState(raw)
    })

    const heroHint = computed(() => {
      if (!trackingData.value) return ''
      return trackingData.value?.hint
        || trackingData.value?.status_hint
        || trackingData.value?.status_desc
        || trackingData.value?.description
        || ''
    })

    const courierName = computed(() => {
      const company = trackingData.value?.courier_company
      if (!company) return '--'
      if (typeof company === 'string') return company
      return company.name || company.company_name || company.title || '--'
    })

    const estimatedDelivery = computed(() => {
      if (!trackingData.value || trackingData.value.is_signed) return ''
      return trackingData.value.estimated_delivery_time
        || trackingData.value.predicted_delivery_time
        || trackingData.value.estimated_delivery_date
        || ''
    })

    const signedText = computed(() => {
      if (trackingData.value?.is_signed) return '已签收'
      return ''
    })

    const stateLabelText = computed(() => {
      const backend = trackingData.value?.state_label || trackingData.value?.state || ''
      if (backend && backend.trim()) return translateTrackingState(backend.trim())
      const label = trackingData.value?.status_label || trackingData.value?.status || ''
      if (label && label.trim()) return translateTrackingState(label.trim())
      return ''
    })

    const shippedAtText = computed(() => {
      if (trackingData.value?.shipped_at) {
        return formatDateTime(trackingData.value.shipped_at)
      }
      return ''
    })

    function isTimelineActive (step) {
      const steps = ['created', 'paid', 'shipped', 'signed', 'completed']
      const currentIndex = steps.indexOf(timelineStep.value)
      const stepIndex = steps.indexOf(step)
      return stepIndex <= currentIndex
    }

    const cancelMutation = useAppMutation({
      mutationFn: () => cancelOrder(orderId.value),
      onSuccess: () => {
        Taro.showToast({ title: '取消成功', icon: 'success' })
        void refetch()
      },
      onError: (error) => {
        Taro.showToast({ title: error?.message || '取消失败', icon: 'none' })
      }
    })

    async function confirmOrderPaid () {
      for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt += 1) {
        await refetch()
        if (order.value?.status === 'paid') return true
        if (attempt < PAYMENT_POLL_MAX_ATTEMPTS - 1) await sleep(PAYMENT_POLL_INTERVAL)
      }
      return false
    }

    async function handlePay () {
      if (!order.value?.id || isPaying.value) return
      isPaying.value = true
      try {
        const paymentPayload = await createOrderPayment(order.value.id)
        const rp = paymentPayload?.request_payment || {}
        await Taro.requestPayment({
          timeStamp: rp.timeStamp,
          nonceStr: rp.nonceStr,
          package: rp.package,
          signType: rp.signType,
          paySign: rp.paySign
        })
        const paid = await confirmOrderPaid()
        Taro.showToast({ title: paid ? '支付成功' : '支付结果待确认', icon: paid ? 'success' : 'none' })
      } catch (error) {
        Taro.showToast({ title: error?.message || '支付未完成', icon: 'none' })
      } finally {
        isPaying.value = false
      }
    }

    async function handleCancel () {
      if (!order.value?.id || isCancelling.value) return
      Taro.showModal({
        title: '确认取消订单？',
        content: '取消后订单将无法恢复',
        success: async (res) => {
          if (res.confirm) {
            isCancelling.value = true
            try {
              await cancelMutation.mutateAsync()
            } finally {
              isCancelling.value = false
            }
          }
        }
      })
    }

    // ---- 售后申请 ----
    const afterSaleReasonOptions = computed(() => {
      const ss = order.value?.shipment_status
      const status = order.value?.status
      // 待发货（已支付未发货）：仅退款
      if (status === 'paid' && ss !== 'shipped' && ss !== 'received' && ss !== 'delivered') {
        return [
          { value: 'dont_want', label: '不想要了' },
          { value: 'wrong_info', label: '信息填写错误' },
          { value: 'price_drop', label: '商品降价' },
          { value: 'wrong_order', label: '拍错商品' },
          { value: 'other', label: '其他原因' }
        ]
      }
      // 运输中（已发货未签收）：仅退款
      if (ss === 'shipped') {
        return [
          { value: 'slow_logistics', label: '物流太慢' },
          { value: 'dont_want', label: '不想要了' },
          { value: 'not_delivered', label: '快递一直未送达' },
          { value: 'other', label: '其他原因' }
        ]
      }
      // 已签收 / 已完成
      // 仅退款原因（未退货，部分补偿）
      if (afterSaleForm.value.request_type === 'refund_only') {
        return [
          { value: 'missing_item', label: '少发货 / 漏发' },
          { value: 'damaged', label: '商品破损' },
          { value: 'other', label: '其他原因' }
        ]
      }
      // 退货退款原因
      return [
        { value: 'damaged', label: '商品破损' },
        { value: 'wrong_item', label: '发错货 / 少发货' },
        { value: 'not_match', label: '与描述不符' },
        { value: 'quality', label: '质量问题' },
        { value: 'other', label: '其他原因' }
      ]
    })

    const afterSaleTypeOptions = computed(() => {
      const ss = order.value?.shipment_status
      const status = order.value?.status
      // 仅退款：待发货(unshipped) / 运输中(shipped) / 已签收(received/delivered) / 已完成(completed)
      const refundOk = ss === 'unshipped' || ss === 'shipped' || ss === 'received' || ss === 'delivered' || status === 'completed'
      // 退货退款：已签收(received/delivered) / 已完成(completed)
      const returnOk = ss === 'received' || ss === 'delivered' || status === 'completed'
      return [
        { value: 'refund_only', label: '仅退款', disabled: !refundOk },
        { value: 'return_refund', label: '退货退款', disabled: !returnOk }
      ]
    })

    const afterSaleTypeHint = computed(() => {
      const ss = order.value?.shipment_status
      const status = order.value?.status
      if (status === 'paid' && ss !== 'shipped' && ss !== 'received') return '' // 待发货：支持仅退款
      if (ss === 'shipped') return '商品运输中，可申请仅退款'
      if (ss === 'received' || ss === 'delivered') return ''
      if (status === 'completed') return ''
      return '当前状态不支持售后'
    })

    const hasSelectedAfterItems = computed(() => {
      return Object.values(afterSaleForm.value._itemQtys || {}).some(q => q > 0)
    })

    const afterSaleEstimatedAmount = computed(() => {
      const qtys = afterSaleForm.value._itemQtys || {}
      let total = 0
      orderItems.value.forEach(item => {
        const qty = qtys[item.id] || 0
        if (qty > 0) {
          total += (Number(item.unit_price) || 0) * qty
        }
      })
      return total
    })

    const canSubmitAfterSale = computed(() => {
      const f = afterSaleForm.value
      if (!f.request_type || !f.reason || !hasSelectedAfterItems.value) return false
      if (f.reason === 'other' && !f.customReason.trim()) return false
      return true
    })

    function getAfterItemQty (item) {
      const qtys = afterSaleForm.value._itemQtys || {}
      return qtys[item.id] || 0
    }

    function decreaseAfterItem (item) {
      if (!afterSaleForm.value._itemQtys) afterSaleForm.value._itemQtys = {}
      const current = afterSaleForm.value._itemQtys[item.id] || 0
      afterSaleForm.value._itemQtys[item.id] = Math.max(0, current - 1)
    }

    function increaseAfterItem (item) {
      if (!afterSaleForm.value._itemQtys) afterSaleForm.value._itemQtys = {}
      const current = afterSaleForm.value._itemQtys[item.id] || 0
      afterSaleForm.value._itemQtys[item.id] = Math.min(item.quantity, current + 1)
    }

    function selectAfterSaleType (type) {
      afterSaleForm.value.request_type = type
      afterSaleForm.value.reason = ''
      afterSaleForm.value.customReason = ''
    }

    function openAfterSaleModal () {
      const ss = order.value?.shipment_status
      const status = order.value?.status
      let defaultType = ''
      // 待发货（paid 未发货）→ 仅退款
      if (status === 'paid' && ss !== 'shipped' && ss !== 'received') defaultType = 'refund_only'
      // 运输中（shipped）→ 仅退款
      else if (ss === 'shipped') defaultType = 'refund_only'
      // 已签收 → 退货退款
      else if (ss === 'received') defaultType = 'return_refund'
      // 已完成 → 退货退款
      else if (status === 'completed') defaultType = 'return_refund'

      afterSaleForm.value = {
        request_type: defaultType,
        reason: '',
        customReason: '',
        images: [],
        _itemQtys: (orderItems.value || []).reduce((acc, item) => {
          acc[item.id] = item.quantity
          return acc
        }, {})
      }
      showAfterSaleModal.value = true
    }

    function closeAfterSaleModal () {
      showAfterSaleModal.value = false
    }

    function chooseAfterImage () {
      Taro.chooseImage({
        count: 6 - afterSaleForm.value.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const newImages = res.tempFilePaths.map(path => ({
            path,
            uploadId: '',
            uploading: false
          }))
          afterSaleForm.value.images.push(...newImages)
        }
      })
    }

    function removeAfterImage (idx) {
      afterSaleForm.value.images.splice(idx, 1)
    }

    async function handleSubmitAfterSale () {
      if (!canSubmitAfterSale.value || afterSaleSubmitting.value || !order.value?.id) return

      afterSaleSubmitting.value = true

      try {
        // 1. 上传凭证图片
        const uploadIds = []
        for (const img of afterSaleForm.value.images) {
          if (img.uploadId) {
            uploadIds.push(img.uploadId)
            continue
          }
          img.uploading = true
          try {
            const result = await uploadEvidenceImage(img.path, order.value.id)
            img.uploadId = result.upload_id
            uploadIds.push(result.upload_id)
          } catch (err) {
            console.error('[aftersale] upload image failed:', err)
            Taro.showToast({ title: '图片上传失败，请重试', icon: 'none' })
            afterSaleSubmitting.value = false
            return
          } finally {
            img.uploading = false
          }
        }

        // 2. 构建请求参数
        const reasonLabel = afterSaleReasonOptions.find(r => r.value === afterSaleForm.value.reason)?.label || afterSaleForm.value.reason
        const finalReason = afterSaleForm.value.reason === 'other'
          ? afterSaleForm.value.customReason.trim()
          : reasonLabel

        const items = orderItems.value
          .filter(item => {
            const qty = afterSaleForm.value._itemQtys[item.id] || 0
            return qty > 0
          })
          .map(item => ({
            order_item_id: item.id,
            quantity: afterSaleForm.value._itemQtys[item.id]
          }))

        const payload = {
          order_id: order.value.id,
          request_type: afterSaleForm.value.request_type,
          reason: finalReason,
          items,
          upload_ids: uploadIds
        }

        console.log('[aftersale] submitting:', payload)

        // 3. 提交售后申请
        const result = await createAfterSale(payload)
        console.log('[aftersale] created:', result)

        Taro.showToast({ title: '售后申请已提交', icon: 'success' })
        showAfterSaleModal.value = false
        void refetch()
      } catch (err) {
        console.error('[aftersale] submit failed:', err)
        const msg = err?.data?.detail || err?.message || '提交失败，请重试'
        Taro.showToast({ title: msg, icon: 'none', duration: 3000 })
      } finally {
        afterSaleSubmitting.value = false
      }
    }

    function handleApplyAfterSale () {
      openAfterSaleModal()
    }

    function handleViewAfterSale () {
      Taro.showToast({ title: '售后处理中，请耐心等待', icon: 'none' })
    }

    async function handleCancelAfterSale () {
      const r = activeAfterSale.value
      if (!r) return
      const requestId = r.request_id || r.id
      if (!requestId) return

      const res = await Taro.showModal({
        title: '取消售后',
        content: '确定要取消本次售后申请吗？',
        confirmText: '确定取消',
        cancelText: '再想想'
      })
      if (!res.confirm) return

      cancelAfterSaleLoading.value = true
      try {
        await cancelAfterSale(requestId, '用户主动取消')
        // 立即清空售后记录，隐藏卡片
        afterSaleRecords.value = []
        Taro.showToast({ title: '已取消售后', icon: 'success' })
        // 刷新订单状态 + 重新拉取售后记录（防止竞态）
        await Promise.all([refetch(), fetchAfterSales(order.value?.id)])
      } catch (err) {
        console.error('[aftersale] cancel failed:', err)
        const msg = err?.message || '取消失败，请重试'
        Taro.showToast({ title: msg, icon: 'none' })
      } finally {
        cancelAfterSaleLoading.value = false
      }
    }

    function handleViewLogistics () {
      if (!order.value?.id) return
      // #region debug-point tracking-open
      console.log('[DEBUG order-ship-sign-flow] tracking panel opened:', { orderId: order.value.id })
      // #endregion debug-point tracking-open
      showTrackingPanel.value = true
      isTrackingLoading.value = true
      getOrderTracking(order.value.id).then((data) => {
        console.log('[tracking] raw data:', JSON.stringify(data))
        if (data?.traces && data.traces.length > 0) {
          console.log('[tracking] first trace keys:', Object.keys(data.traces[0]))
          console.log('[tracking] first trace:', JSON.stringify(data.traces[0]))
        }
        trackingData.value = data
        isTrackingLoading.value = false
      }).catch((err) => {
        isTrackingLoading.value = false
        Taro.showToast({ title: err?.message || '查询失败', icon: 'none' })
      })
    }

    function closeTrackingPanel () {
      showTrackingPanel.value = false
    }

    function onCopyTrackingNo () {
      if (trackingData.value?.tracking_no) {
        Taro.setClipboardData({
          data: trackingData.value.tracking_no,
          success: () => {
            Taro.showToast({ title: '已复制运单号', icon: 'success' })
          }
        })
      }
    }

    function onCallPhone (phone) {
      if (!phone) return
      Taro.makePhoneCall({
        phoneNumber: String(phone).replace(/\s/g, ''),
        fail: () => {
          Taro.setClipboardData({
            data: String(phone),
            success: () => {
              Taro.showToast({ title: '电话已复制', icon: 'success' })
            }
          })
        }
      })
    }

    useLoad((params) => {
      orderId.value = params?.id || getCurrentInstance()?.router?.params?.id || ''
    })

    usePullDownRefresh(async () => {
      try {
        await refetch()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      createdAtText,
      detailAddress: orderAddress,
      errorMessage,
      formatDateTime,
      formatPrice,
      formatItemPrice,
      formatItemSubtotal,
      fullAddressText,
      handleCancel,
      handlePay,
      handleApplyAfterSale,
      handleViewAfterSale,
      handleCancelAfterSale,
      cancelAfterSaleLoading,
      showReturnLogisticsButton,
      hasReturnLogisticsInfo,
      showReturnLogisticsModal,
      returnLogisticsForm,
      returnLogisticsSubmitting,
      openReturnLogisticsModal,
      closeReturnLogisticsModal,
      handleSubmitReturnLogistics,
      copyReturnTrackingNo,
      completedAfterSale,
      cancelledAfterSale,
      afterSaleLoading,
      isAfterSale,
      isOrderEligibleForAfterSale,
      activeAfterSale,
      displayAfterSale,
      afterSaleStatusText,
      afterSaleTypeLabel,
      rejectReason,
      afterSaleEvidence,
      afterSaleTimeline,
      previewEvidence,
      afterSaleSteps,
      showAfterSaleModal,
      closeAfterSaleModal,
      selectAfterSaleType,
      afterSaleForm,
      afterSaleSubmitting,
      afterSaleTypeOptions,
      afterSaleReasonOptions,
      afterSaleTypeHint,
      hasSelectedAfterItems,
      canSubmitAfterSale,
      afterSaleEstimatedAmount,
      getAfterItemQty,
      decreaseAfterItem,
      increaseAfterItem,
      chooseAfterImage,
      removeAfterImage,
      handleSubmitAfterSale,
      handleViewLogistics,
      closeTrackingPanel,
      hasShipmentStatus,
      isCancelling,
      isError,
      isFetching,
      isLoading,
      isPaying,
      isTimelineActive,
      order,
      orderAddress,
      orderItems,
      orderTypeLabel,
      refetch,
      showLogistics,
      showTrackingPanel,
      timelineLabels,
      trackingData,
      isTrackingLoading,
      trackingTraces,
      trackingSigned,
      courierName,
      iconLarge,
      heroStatus,
      heroHint,
      estimatedDelivery,
      signedText,
      stateLabelText,
      shippedAtText,
      onCopyTrackingNo,
      onCallPhone,
      statusMeta
    }
  },

  onShareAppMessage () {
    return {
      title: '柑之怡商户端',
      path: '/pages/home/index'
    }
  }
}
</script>
