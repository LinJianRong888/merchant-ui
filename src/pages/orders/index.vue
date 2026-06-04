<template>
  <view class="orders-page">
    <view class="tabs-container">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { active: activeFilter === tab.value }]"
        @tap="handleTabChange(tab.value)"
      >
        {{ tab.label }}
        <text v-if="tab.count > 0" :class="['tab-count', { 'tab-count--active': activeFilter === tab.value }]">{{ tab.count }}</text>
      </view>
    </view>

    <view v-if="isLoading" class="order-skeleton-list">
      <view v-for="item in skeletonItems" :key="item" class="order-card order-card--skeleton">
        <view class="skeleton-line skeleton-line--title"></view>
        <view class="skeleton-line skeleton-line--meta"></view>
        <view class="skeleton-line skeleton-line--meta short"></view>
      </view>
    </view>

    <view v-else-if="isError" class="orders-state-panel">
      <text class="orders-state-panel__title">订单加载失败</text>
      <text class="orders-state-panel__desc">{{ errorMessage }}</text>
      <button class="orders-state-panel__button" :loading="isFetching" @tap="handleRetry">重新加载</button>
    </view>

    <view v-else-if="!filteredOrders.length" class="orders-state-panel orders-state-panel--empty">
      <text class="orders-state-panel__title">还没有订单</text>
      <text class="orders-state-panel__desc">完成一次下单后，这里会展示订单号和支付状态。</text>
    </view>

    <view v-else class="orders-list">
      <view
        v-for="order in filteredOrders"
        :key="order.id || order.order_no"
        class="order-card"
        @tap="handleOpenDetail(order)"
      >
        <view class="order-header">
          <text class="order-no">订单编号：{{ order.orderNoText }}</text>
          <text :class="['order-status', order.statusClass]">{{ order.statusLabel }}</text>
        </view>

        <view class="order-products">
          <view v-for="(item, itemIndex) in order.items" :key="`${order.id}-${itemIndex}`" class="product-item">
            <view class="product-image">
              <text v-if="!item.product_image" class="product-placeholder">📷</text>
              <image v-else :src="item.product_image" class="product-img" mode="aspectFill" />
            </view>
            <view class="product-info">
              <text class="product-name">{{ item.product_name || '商品' }}</text>
              <text class="product-desc">{{ item.description || '' }}</text>
              <view class="product-bottom">
                <text class="product-quantity">x{{ item.quantity || 1 }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="order-footer">
          <view class="order-total">
            <text class="total-label">应付金额：</text>
            <text class="total-price">{{ order.totalAmountText }}</text>
          </view>
          <view class="order-actions" @tap.stop>
            <button v-if="order.canPay" class="action-btn action-btn--cancel" :loading="cancellingOrderId === order.id" @tap="handleCancelOrder(order)">取消订单</button>
            <button v-if="order.canPay" class="action-btn action-btn--pay" :loading="payingOrderId === order.id" @tap="handlePayOrder(order)">去支付</button>
          </view>
        </view>

        <view v-if="order.canPay" class="countdown-tip">
          {{ formatCountdown(order) }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import Taro, { useDidShow, useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useAppMutation, useAppQuery } from '@/utils/app-query'

import { createOrderPayment, listOrders, cancelOrder, getOrderTracking } from '@/api/orders'
import { listSaleProducts } from '@/api/products'
import { useAuthStore } from '@/stores/auth'

import './index.scss'

const LOGIN_PAGE_PATH = '/pages/index/index'
const ORDER_DETAIL_PAGE_PATH = '/pages/orders/detail/index'
const PAYMENT_POLL_INTERVAL = 1500
const PAYMENT_POLL_MAX_ATTEMPTS = 4

function normalizeOrderFilter (value) {
  if (['pending', 'paid', 'shipped', 'completed'].includes(value)) {
    return value
  }

  return 'all'
}

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
  if (!value) {
    return '时间待同步'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ]

  const time = [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0')
  ]

  return `${parts.join('.')} ${time.join(':')}`
}

function getStatusMeta (status, shipmentStatus, isSigned, trackingState, backendLabel) {
  if (backendLabel && backendLabel.trim()) {
    const label = backendLabel.trim()
    if (status === 'pending') return { label, className: 'is-pending', canPay: true }
    if (status === 'cancelled' || status === 'closed') return { label, className: 'is-cancelled', canPay: false }
    return { label, className: 'is-paid', canPay: false }
  }

  if (shipmentStatus === 'shipped') {
    const stateMap = {
      collecting: '待揽收',
      collected: '已揽收',
      delivering: '运输中',
      out_for_delivery: '派送中',
      failed: '异常',
      returning: '退回中',
      returned: '已退回',
      cancel: '已取消'
    }
    return { label: stateMap[trackingState] || '待收货', className: 'is-paid', canPay: false }
  }

  if (status === 'paid') {
    return { label: '已支付', className: 'is-paid', canPay: false }
  }

  if (status === 'pending') {
    return { label: '待处理', className: 'is-pending', canPay: true }
  }

  if (status === 'processing') {
    return { label: '处理中', className: 'is-paid', canPay: false }
  }

  if (status === 'cancelled') {
    return { label: '已取消', className: 'is-cancelled', canPay: false }
  }

  if (status === 'completed') {
    return { label: '已完成', className: 'is-paid', canPay: false }
  }

  return { label: '状态待同步', className: 'is-neutral', canPay: false }
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

function normalizeOrders (items, priceMap, trackingStateMap) {
  if (!Array.isArray(items)) {
    return []
  }

  const stateMap = trackingStateMap || {}
  const priceMapObj = priceMap || {}

  return [...items]
    .sort((left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime())
    .map((item) => {
      const trackingState = stateMap[String(item?.id)] || ''
      const backendLabel = item?.status_label || item?.status_display || item?.display_status || item?.shipment_status_label || ''
      const statusMeta = getStatusMeta(item?.status, item?.shipment_status, false, trackingState, backendLabel)
      const orderItems = Array.isArray(item?.items) ? item.items : []
      const totalAmount = Number(item?.total_amount || 0)
      const totalQuantity = orderItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)

      const enrichedItems = orderItems.map((it) => {
        const productId = it.product_id
        const quantity = Number(it.quantity || 0)
        const lineAmount = Number(it.line_amount || 0)
        const unitPrice = Number(it.unit_price || (productId != null ? (priceMapObj[String(productId)] || priceMapObj[Number(productId)] || 0) : 0))
        const fallbackAmount = totalQuantity > 0 ? Math.round((quantity / totalQuantity) * totalAmount * 100) / 100 : 0

        return {
          ...it,
          _displayAmount: lineAmount || unitPrice * quantity || fallbackAmount
        }
      })

      return {
        ...item,
        orderNoText: item?.order_no || `订单 #${item?.id || '--'}`,
        createdAtText: formatDateTime(item?.created_at),
        totalAmountText: formatPrice(item?.total_amount),
        statusLabel: statusMeta.label,
        statusClass: statusMeta.className,
        canPay: statusMeta.canPay,
        trackingState
      }
    })
}

function formatQueryError (error) {
  const lines = [error?.message || '请稍后重试']

  if (error?.statusCode) {
    lines.push(`status: ${error.statusCode}`)
  }

  if (error?.request?.method && error?.request?.url) {
    lines.push(`${error.request.method.toUpperCase()} ${error.request.url}`)
  }

  return lines.join('\n')
}

async function invokeWechatPayment (paymentPayload) {
  const requestPayment = paymentPayload?.request_payment || {}

  await Taro.requestPayment({
    timeStamp: requestPayment.timeStamp,
    nonceStr: requestPayment.nonceStr,
    package: requestPayment.package,
    signType: requestPayment.signType,
    paySign: requestPayment.paySign
  })
}

async function fetchOrders () {
  let list
  let products = []

  try {
    const results = await Promise.allSettled([
      listOrders(),
      listSaleProducts()
    ])

    if (results[0].status === 'fulfilled') {
      list = results[0].value
    } else {
      throw results[0].reason
    }

    if (results[1].status === 'fulfilled') {
      products = results[1].value
    }
  } catch (err) {
    console.error('[orders] fetchOrders failed:', err?.message || err)
    throw err
  }

  const priceMap = buildProductPriceMap(products)

  const shippedOrders = list.filter(o => o.shipment_status === 'shipped')
  const trackingStateMap = {}

  if (shippedOrders.length > 0) {
    const trackingResults = await Promise.allSettled(
      shippedOrders.map(o => getOrderTracking(o.id))
    )
    trackingResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const tracking = result.value
        const orderId = String(shippedOrders[i]?.id)
        if (tracking?.is_signed || tracking?.state_label === 'signed' || tracking?.state_label === 'delivered') {
          trackingStateMap[orderId] = 'signed'
        } else if (tracking?.state_label) {
          trackingStateMap[orderId] = tracking.state_label
        }
      }
    })
  }

  return normalizeOrders(list, priceMap, trackingStateMap)
}

export default {
  setup () {
    const authStore = useAuthStore()
    const skeletonItems = ['skeleton-1', 'skeleton-2', 'skeleton-3']
    const activeFilter = ref('all')
    const payingOrderId = ref(null)
    const cancellingOrderId = ref(null)
    const fallbackOrders = ref([])
    const fallbackError = ref(null)
    const now = ref(Date.now())

    let countdownTimer = null
    onMounted(() => {
      countdownTimer = setInterval(() => {
        now.value = Date.now()
      }, 1000)
    })
    onUnmounted(() => {
      if (countdownTimer) clearInterval(countdownTimer)
    })

    function isOrderCompleted (item) {
      return item?.status === 'completed'
    }

    const tabs = computed(() => {
      const list = orderList.value
      const pendingCount = list.filter(o => o.status === 'pending').length
      const paidCount = list.filter(o => o.status === 'paid' && o.shipment_status !== 'shipped').length
      const shippedCount = list.filter(o => o.shipment_status === 'shipped' && !isOrderCompleted(o)).length
      const completedCount = list.filter(o => isOrderCompleted(o)).length

      return [
        { label: '全部', value: 'all', count: list.length },
        { label: '待处理', value: 'pending', count: pendingCount },
        { label: '待发货', value: 'paid', count: paidCount },
        { label: '待收货', value: 'shipped', count: shippedCount },
        { label: '已完成', value: 'completed', count: completedCount }
      ]
    })

    const {
      data: orders,
      isLoading,
      isFetching,
      isError,
      error,
      refetch
    } = useAppQuery({
      queryKey: ['orders', 'v3'],
      queryFn: fetchOrders,
      enabled: computed(() => authStore.isAuthenticated)
    })

    const orderList = computed(() => orders.value || fallbackOrders.value)
    const hasError = computed(() => isError.value || Boolean(fallbackError.value))
    const errorMessage = computed(() => formatQueryError(fallbackError.value || error.value))
    const filteredOrders = computed(() => {
      if (activeFilter.value === 'all') {
        return orderList.value
      }
      if (activeFilter.value === 'shipped') {
        return orderList.value.filter((item) => item.shipment_status === 'shipped' && !isOrderCompleted(item))
      }
      if (activeFilter.value === 'paid') {
        return orderList.value.filter((item) => item.status === 'paid' && item.shipment_status !== 'shipped')
      }
      if (activeFilter.value === 'completed') {
        return orderList.value.filter((item) => isOrderCompleted(item))
      }
      return orderList.value.filter((item) => item.status === activeFilter.value)
    })

    async function loadOrdersDirect () {
      console.info('[orders-page] fallback load start')
      fallbackError.value = null
      fallbackOrders.value = await fetchOrders()
      console.info('[orders-page] fallback load success', {
        count: fallbackOrders.value.length
      })
    }

    async function refreshOrders () {
      fallbackError.value = null

      try {
        const result = await refetch()

        if (Array.isArray(result.data)) {
          fallbackOrders.value = []
          return
        }
      } catch (queryError) {
        fallbackError.value = queryError
      }

      try {
        await loadOrdersDirect()
      } catch (directError) {
        fallbackError.value = directError
      }
    }

    const cancelMutation = useAppMutation({
      mutationFn: (orderId) => cancelOrder(orderId),
      onSuccess: () => {
        Taro.showToast({ title: '取消成功', icon: 'success' })
        void refreshOrders()
      },
      onError: (error) => {
        Taro.showToast({ title: error?.message || '取消失败', icon: 'none' })
      }
    })

    function handleTabChange (tabValue) {
      activeFilter.value = tabValue
    }

    async function handleCancelOrder (order) {
      if (!order?.id || cancellingOrderId.value) return
      Taro.showModal({
        title: '确认取消订单？',
        content: '取消后订单将无法恢复',
        success: async (res) => {
          if (res.confirm) {
            cancellingOrderId.value = order.id
            try {
              await cancelMutation.mutateAsync(order.id)
            } finally {
              cancellingOrderId.value = null
            }
          }
        }
      })
    }

    async function navigateToLogin () {
      await Taro.redirectTo({
        url: LOGIN_PAGE_PATH
      })
    }

    async function ensureAuthenticated () {
      if (!authStore.isAuthenticated) {
        await navigateToLogin()
        return false
      }

      return true
    }

    async function confirmOrderPaid (targetOrderId) {
      for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt += 1) {
        await refreshOrders()

        const latestOrder = orderList.value.find((item) => item.id === targetOrderId)

        if (latestOrder?.status === 'paid') {
          return latestOrder
        }

        if (attempt < PAYMENT_POLL_MAX_ATTEMPTS - 1) {
          await sleep(PAYMENT_POLL_INTERVAL)
        }
      }

      return null
    }

    async function handleRetry () {
      await refreshOrders()
    }

    async function handleOpenDetail (order) {
      if (!order?.id) return
      await Taro.navigateTo({
        url: `${ORDER_DETAIL_PAGE_PATH}?id=${order.id}`
      })
    }

    function handlePayOrder (order) {
      return (async () => {
        if (!order?.id || payingOrderId.value) {
          return
        }

        payingOrderId.value = order.id

        try {
          const paymentPayload = await createOrderPayment(order.id)

          await invokeWechatPayment(paymentPayload)

          const paidOrder = await confirmOrderPaid(order.id)

          if (paidOrder?.status === 'paid') {
            Taro.showToast({
              title: '支付成功',
              icon: 'success'
            })
            return
          }

          Taro.showToast({
            title: '支付结果待确认',
            icon: 'none'
          })
        } catch (error) {
          Taro.showToast({
            title: error?.message || '支付未完成',
            icon: 'none'
          })
        } finally {
          payingOrderId.value = null
        }
      })()
    }

    useLoad((params) => {
      activeFilter.value = normalizeOrderFilter(params?.tab)
    })

    useDidShow(() => {
      authStore.hydrate()

      void (async () => {
        const isAuthenticated = await ensureAuthenticated()

        if (isAuthenticated) {
          await refreshOrders()
        }
      })()
    })

    usePullDownRefresh(async () => {
      try {
        await refreshOrders()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    function formatCountdown (order) {
      if (!order?.created_at) return '14:10后自动取消'
      const created = new Date(order.created_at).getTime()
      const expireAt = created + 15 * 60 * 1000
      const remaining = expireAt - now.value
      if (remaining <= 0) return '订单即将取消'
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}后自动取消`
    }

    return {
      errorMessage,
      handleOpenDetail,
      handlePayOrder,
      handleRetry,
      filteredOrders,
      isError: hasError,
      isFetching,
      isLoading,
      orders: orderList,
      payingOrderId,
      cancellingOrderId,
      skeletonItems,
      tabs,
      activeFilter,
      handleTabChange,
      handleCancelOrder,
      formatCountdown
    }
  }
}
</script>
