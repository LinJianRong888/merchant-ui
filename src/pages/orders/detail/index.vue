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
          <view v-if="order.shipment_status === 'shipped'" class="detail-info-item">
            <text class="detail-info-item__label">发货状态</text>
            <text class="detail-info-item__value is-highlight">已发货</text>
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
              <text class="timeline-item__title">订单已创建</text>
              <text class="timeline-item__time">{{ createdAtText }}</text>
              <text class="timeline-item__desc">订单已提交，等待付款</text>
            </view>
          </view>
          <view v-if="isTimelineActive('paid')" :class="['timeline-item', { active: isTimelineActive('paid') }]">
            <view class="timeline-item__dot"></view>
            <view class="timeline-item__content">
              <text class="timeline-item__title">买家已付款</text>
              <text v-if="order.paid_at" class="timeline-item__time">{{ formatDateTime(order.paid_at) }}</text>
              <text class="timeline-item__desc">订单已支付，等待商家发货</text>
            </view>
          </view>
          <view v-if="isTimelineActive('shipped')" :class="['timeline-item', { active: isTimelineActive('shipped') }]">
            <view class="timeline-item__dot"></view>
            <view class="timeline-item__content">
              <text class="timeline-item__title">商家已发货</text>
              <text v-if="order.shipment_status === 'shipped'" class="timeline-item__time">已发货</text>
              <text class="timeline-item__desc">包裹运输中，请注意查收</text>
            </view>
          </view>
          <view v-if="isTimelineActive('completed')" :class="['timeline-item', { active: isTimelineActive('completed') }]">
            <view class="timeline-item__dot"></view>
            <view class="timeline-item__content">
              <text class="timeline-item__title">订单已完成</text>
              <text class="timeline-item__desc">订单已签收，交易完成</text>
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
          <text class="tracking-panel__title">物流详情</text>
          <text class="tracking-panel__close" @tap="closeTrackingPanel">✕</text>
        </view>

        <view v-if="isTrackingLoading" class="tracking-panel__loading">
          <text>查询中...</text>
        </view>

        <template v-else-if="trackingData">
          <view class="tracking-courier">
            <text class="tracking-courier__company">{{ trackingData.courier_company?.name || '--' }}</text>
            <text class="tracking-courier__no">运单号：{{ trackingData.tracking_no || '--' }}</text>
            <text v-if="trackingData.state_label" class="tracking-courier__state">{{ trackingData.state_label }}</text>
          </view>

          <view v-if="trackingTraces.length > 0" class="tracking-timeline">
            <view v-for="(trace, idx) in trackingTraces" :key="idx" :class="['tracking-trace', { 'tracking-trace--latest': idx === trackingTraces.length - 1 }]">
              <view class="tracking-trace__dot"></view>
              <view class="tracking-trace__content">
                <text class="tracking-trace__status">{{ trace.status }}</text>
                <view class="tracking-trace__meta">
                  <text class="tracking-trace__time">{{ trace.time }}</text>
                  <text v-if="trace.area_name" class="tracking-trace__area">{{ trace.area_name }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="tracking-panel__empty">暂无物流轨迹</view>
        </template>

        <view v-else class="tracking-panel__empty">获取物流信息失败</view>
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

function getStatusMeta (status, shipmentStatus) {
  if (shipmentStatus === 'shipped') return { label: '已发货', className: 'is-paid' }
  if (status === 'paid') return { label: '已支付', className: 'is-paid' }
  if (status === 'pending') return { label: '待支付', className: 'is-pending' }
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
  if (order?.status === 'cancelled' || order?.status === 'closed') return 'cancelled'
  if (order?.status === 'completed') return 'completed'
  if (order?.shipment_status === 'shipped') return 'shipped'
  if (order?.status === 'paid') return 'paid'
  return 'created'
}

function formatQueryError (error) {
  const lines = [error?.message || '请稍后重试']
  if (error?.statusCode) lines.push(`status: ${error.statusCode}`)
  if (error?.request?.method && error?.request?.url) {
    lines.push(`${error.request.method.toUpperCase()} ${error.request.url}`)
  }
  return lines.join('\n')
}

export default {
  setup () {
    const orderId = ref('')
    const isPaying = ref(false)
    const isCancelling = ref(false)

    const showTrackingPanel = ref(false)
    const trackingData = ref(null)
    const isTrackingLoading = ref(false)

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

        try {
          const detail = await getOrderDetail(orderId.value)
          return enrichOrderItems(detail, priceMap)
        } catch {
          const list = await listOrders()
          if (Array.isArray(list)) {
            const found = list.find((item) => String(item?.id) === String(orderId.value)) || null
            return found ? enrichOrderItems(found, priceMap) : null
          }
          return null
        }
      },
      enabled: computed(() => Boolean(orderId.value))
    })

    const errorMessage = computed(() => formatQueryError(error.value))
    const createdAtText = computed(() => formatDateTime(order.value?.created_at))
    const statusMeta = computed(() => getStatusMeta(order.value?.status, order.value?.shipment_status))
    const orderTypeLabel = computed(() => getOrderTypeLabel(order.value?.order_type))
    const orderItems = computed(() => (Array.isArray(order.value?.items) ? order.value.items : []))
    const orderAddress = computed(() => order.value?.address || null)
    const fullAddressText = computed(() => orderAddress.value ? formatFullAddress(orderAddress.value) : '')

    const timelineStep = computed(() => getTimelineStep(order.value))

    const showLogistics = computed(() => {
      const step = timelineStep.value
      return step === 'shipped' || step === 'completed'
    })

    const trackingTraces = computed(() => {
      if (!trackingData.value?.traces) return []
      return trackingData.value.traces
    })

    function isTimelineActive (step) {
      const steps = ['created', 'paid', 'shipped', 'completed']
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
      trackingData.value = null
      isTrackingLoading.value = true
      getOrderTracking(order.value.id).then((data) => {
        // eslint-disable-next-line no-console
        console.log('[order-detail] tracking response', JSON.stringify(data, null, 2))
        trackingData.value = data
        isTrackingLoading.value = false
      }).catch((err) => {
        isTrackingLoading.value = false
        Taro.showToast({ title: err?.message || '查询失败', icon: 'none' })
      })
    }

    function closeTrackingPanel () {
      showTrackingPanel.value = false
      trackingData.value = null
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
      trackingData,
      isTrackingLoading,
      trackingTraces,
      statusMeta
    }
  }
}
</script>
