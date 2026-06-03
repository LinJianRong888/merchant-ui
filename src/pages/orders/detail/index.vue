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

      <view v-else-if="order.status !== 'cancelled' && order.status !== 'closed'" class="detail-footer">
        <button class="detail-action-btn detail-action-btn--after-sale" @tap="handleApplyAfterSale">申请售后</button>
        <button class="detail-action-btn detail-action-btn--service" @tap="handleContactService">咨询客服</button>
        <button v-if="showLogistics" class="detail-action-btn detail-action-btn--logistics" @tap="handleViewLogistics">查看物流</button>
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
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { getCurrentInstance, useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useAppMutation, useAppQuery } from '@/utils/app-query'

import { createOrderPayment, getOrderDetail, listOrders, cancelOrder, getOrderTracking } from '@/api/orders'
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
    return { label, className: 'is-paid' }
  }
  if (shipmentStatus === 'shipped') return { label: '待收货', className: 'is-paid' }
  if (status === 'paid') return { label: '已支付', className: 'is-paid' }
  if (status === 'pending') return { label: '待处理', className: 'is-pending' }
  if (status === 'processing') return { label: '处理中', className: 'is-paid' }
  if (status === 'cancelled' || status === 'closed') return { label: '已取消', className: 'is-cancelled' }
  if (status === 'completed') return { label: '已完成', className: 'is-paid' }
  return { label: status || '状态待同步', className: 'is-neutral' }
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
  if (order?.shipment_status === 'shipped') return 'shipped'
  if (backend === 'paid') return 'paid'
  return 'created'
}

function getTimelineDefaultLabels () {
  return {
    created: { title: '订单已创建', desc: '订单已提交，等待付款' },
    paid: { title: '买家已付款', desc: '订单已支付，等待商家发货' },
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
    const orderId = ref('')
    const isPaying = ref(false)
    const isCancelling = ref(false)

    const showTrackingPanel = ref(false)
    const trackingData = ref(null)
    const isTrackingLoading = ref(false)

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
      if (orderData?.id && (orderData.shipment_status === 'shipped' || orderData.status === 'completed')) {
        getOrderTracking(orderData.id).then(data => {
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
          console.log('[order-status]', {
            id: detail.id,
            status: detail.status,
            status_label: detail.status_label,
            status_display: detail.status_display,
            display_status: detail.display_status,
            shipment_status: detail.shipment_status,
            shipment_status_label: detail.shipment_status_label,
            _allKeys: Object.keys(detail)
          })
          fetchTrackingIfNeeded(detail)
        }
        return detail
      },
      enabled: computed(() => Boolean(orderId.value))
    })

    const errorMessage = computed(() => formatQueryError(error.value))
    const createdAtText = computed(() => formatDateTime(order.value?.created_at))
    const statusMeta = computed(() => {
      const backendLabel = order.value?.status_label
        || order.value?.status_display
        || order.value?.display_status
        || order.value?.shipment_status_label
        || ''
      return getStatusMeta(order.value?.status, order.value?.shipment_status, trackingSigned.value, backendLabel)
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
      if (trackingSigned.value) return 'signed'
      return getTimelineStep(order.value)
    })

    const showLogistics = computed(() => {
      if (trackingData.value) return true
      const s = order.value?.shipment_status
      const status = order.value?.status
      return s === 'shipped' || s === 'delivered' || status === 'completed' || trackingSigned.value
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
          title: label || defaults.paid.title,
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
      if (!label) return '📦'
      const s = label.toLowerCase()
      if (s.includes('签收') || s.includes('送达') || s.includes('完成')) return '✅'
      if (s.includes('派送') || s.includes('配送')) return '🏍'
      if (s.includes('运输') || s.includes('中转') || s.includes('发往') || s.includes('到达') || s.includes('离开')) return '🚚'
      if (s.includes('揽收') || s.includes('取件') || s.includes('收件')) return '📦'
      if (s.includes('待取') || s.includes('待揽') || s.includes('下单')) return '📦'
      if (s.includes('退回') || s.includes('退件')) return '↩'
      if (s.includes('异常') || s.includes('滞留') || s.includes('失败') || s.includes('问题件')) return '⚠'
      if (s.includes('取消')) return '✕'
      return '🚚'
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

    function handleApplyAfterSale () {
      Taro.showToast({ title: '售后功能接入中', icon: 'none' })
    }

    function handleContactService () {
      Taro.showToast({ title: '客服功能接入中', icon: 'none' })
    }

    function handleViewLogistics () {
      if (!order.value?.id) return
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
      handleContactService,
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
  }
}
</script>
