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
      <button class="detail-state-panel__button" :loading="isFetching" @tap="loadOrder">重试</button>
    </view>

    <view v-else-if="order" class="detail-shell">
      <view class="detail-status-card">
        <view class="detail-status-card__header">
          <view class="detail-status-card__order-info">
            <text class="detail-status-card__order-no">{{ order.order_no || '--' }}</text>
            <text class="detail-status-card__time">{{ createdAtText }}</text>
          </view>
          <text :class="['detail-status-card__badge', statusMeta.className]">{{ statusMeta.label }}</text>
        </view>
        <text class="detail-status-card__type">{{ orderTypeLabel }}</text>
      </view>

      <view class="detail-section">
        <text class="detail-section__title">商品信息</text>
        <view class="detail-items">
          <view v-for="(item, idx) in orderItems" :key="idx" class="detail-item">
            <view class="detail-item__header">
              <text class="detail-item__name">{{ item.product_name || '商品' }}</text>
              <text class="detail-item__qty">x{{ item.quantity }}</text>
            </view>
            <view class="detail-item__meta-row">
              <text v-if="item.specification" class="detail-item__meta">规格 {{ item.specification }}</text>
              <text class="detail-item__meta">单价 {{ formatPrice(item.unit_price) }}</text>
              <text class="detail-item__meta">小计 {{ formatPrice(item.line_amount) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="detail-section">
        <text class="detail-section__title">金额明细</text>
        <view class="detail-amounts">
          <view class="detail-amounts__row">
            <text class="detail-amounts__label">订单金额</text>
            <text class="detail-amounts__value">{{ formatPrice(order.total_amount) }}</text>
          </view>
          <view class="detail-amounts__row">
            <text class="detail-amounts__label">已支付</text>
            <text class="detail-amounts__value is-muted">{{ formatPrice(order.paid_amount) }}</text>
          </view>
          <view v-if="order.paid_at" class="detail-amounts__row">
            <text class="detail-amounts__label">支付时间</text>
            <text class="detail-amounts__value is-muted">{{ formatDateTime(order.paid_at) }}</text>
          </view>
        </view>
      </view>

      <view v-if="orderAddress" class="detail-section">
        <text class="detail-section__title">收货地址</text>
        <view class="detail-address">
          <view class="detail-address__contact">
            <text class="detail-address__name">{{ orderAddress.contact_name }}</text>
            <text class="detail-address__phone">{{ orderAddress.contact_phone }}</text>
          </view>
          <text class="detail-address__full">{{ fullAddressText }}</text>
        </view>
      </view>

      <view v-if="order.status === 'pending'" class="detail-footer">
        <button class="detail-cancel-button" :loading="isCancelling" @tap="handleCancel">取消订单</button>
        <button class="detail-pay-button" :loading="isPaying" @tap="handlePay">继续支付</button>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { getCurrentInstance, useLoad, usePullDownRefresh } from '@tarojs/taro'

import { createOrderPayment, getOrderDetail, listOrders, cancelOrder } from '@/api/orders'

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

function getStatusMeta (status) {
  if (status === 'paid') return { label: '已支付', className: 'is-paid' }
  if (status === 'pending') return { label: '待支付', className: 'is-pending' }
  if (status === 'cancelled' || status === 'closed') return { label: '已取消', className: 'is-cancelled' }
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
    const order = ref(null)
    const isLoading = ref(true)
    const isFetching = ref(false)
    const isPaying = ref(false)
    const isCancelling = ref(false)
    const loadError = ref(null)

    const isError = computed(() => Boolean(loadError.value))
    const errorMessage = computed(() => formatQueryError(loadError.value))
    const createdAtText = computed(() => formatDateTime(order.value?.created_at))
    const statusMeta = computed(() => getStatusMeta(order.value?.status))
    const orderTypeLabel = computed(() => getOrderTypeLabel(order.value?.order_type))
    const orderItems = computed(() => (Array.isArray(order.value?.items) ? order.value.items : []))
    const orderAddress = computed(() => order.value?.address || null)
    const fullAddressText = computed(() => orderAddress.value ? formatFullAddress(orderAddress.value) : '')

    async function fetchOrderDetail () {
      try {
        return await getOrderDetail(orderId.value)
      } catch {
        const list = await listOrders()
        if (Array.isArray(list)) {
          return list.find((item) => String(item?.id) === String(orderId.value)) || null
        }
        return null
      }
    }

    async function loadOrder () {
      if (!orderId.value || isFetching.value) return
      isFetching.value = true
      loadError.value = null
      if (!order.value) isLoading.value = true
      try {
        const data = await fetchOrderDetail()
        if (data) {
          order.value = data
        } else {
          throw new Error('订单不存在')
        }
      } catch (error) {
        loadError.value = error
      } finally {
        isFetching.value = false
        isLoading.value = false
      }
    }

    async function confirmOrderPaid () {
      for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt += 1) {
        await loadOrder()
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
              await cancelOrder(order.value.id)
              Taro.showToast({ title: '取消成功', icon: 'success' })
              await loadOrder()
            } catch (error) {
              Taro.showToast({ title: error?.message || '取消失败', icon: 'none' })
            } finally {
              isCancelling.value = false
            }
          }
        }
      })
    }

    useLoad((params) => {
      orderId.value = params?.id || getCurrentInstance()?.router?.params?.id || ''
      void loadOrder()
    })

    usePullDownRefresh(async () => {
      try {
        await loadOrder()
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
      fullAddressText,
      handleCancel,
      handlePay,
      isCancelling,
      isError,
      isFetching,
      isLoading,
      isPaying,
      order,
      orderAddress,
      orderItems,
      orderTypeLabel,
      statusMeta
    }
  }
}
</script>
