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
              <text v-if="!item.image" class="product-placeholder">📷</text>
              <image v-else :src="item.image" class="product-img" mode="aspectFill" />
            </view>
            <view class="product-info">
              <text class="product-name">{{ item.product_name || '商品' }}</text>
              <text class="product-desc">{{ item.description || '' }}</text>
              <view class="product-bottom">
                <text class="product-price">¥{{ (item.price || 0).toFixed(2) }}</text>
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
          14:10后自动取消
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useDidShow, useLoad, usePullDownRefresh } from '@tarojs/taro'

import { createOrderPayment, listOrders, cancelOrder } from '@/api/orders'
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

function getStatusMeta (status) {
  if (status === 'paid') {
    return { label: '已支付', className: 'is-paid', canPay: false }
  }

  if (status === 'pending') {
    return { label: '待支付', className: 'is-pending', canPay: true }
  }

  if (status === 'cancelled' || status === 'closed') {
    return { label: '已取消', className: 'is-cancelled', canPay: false }
  }

  return { label: status || '状态待同步', className: 'is-neutral', canPay: false }
}

function normalizeOrders (items) {
  if (!Array.isArray(items)) {
    return []
  }

  return [...items]
    .sort((left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime())
    .map((item) => {
      const statusMeta = getStatusMeta(item?.status)

      return {
        ...item,
        items: Array.isArray(item?.items) ? item.items : [],
        orderNoText: item?.order_no || `订单 #${item?.id || '--'}`,
        createdAtText: formatDateTime(item?.created_at),
        totalAmountText: formatPrice(item?.total_amount),
        statusLabel: statusMeta.label,
        statusClass: statusMeta.className,
        canPay: statusMeta.canPay
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

export default {
  setup () {
    const authStore = useAuthStore()
    const skeletonItems = ['skeleton-1', 'skeleton-2', 'skeleton-3']
    const orders = ref([])
    const activeFilter = ref('all')
    const isLoading = ref(true)
    const isFetching = ref(false)
    const loadError = ref(null)
    const payingOrderId = ref(null)
    const cancellingOrderId = ref(null)

    const tabs = [
      { label: '全部', value: 'all' },
      { label: '待付款', value: 'pending' },
      { label: '待发货', value: 'paid' },
      { label: '待收货', value: 'shipped' },
      { label: '待评价', value: 'completed' }
    ]

    const isError = computed(() => Boolean(loadError.value))
    const errorMessage = computed(() => formatQueryError(loadError.value))
    const filteredOrders = computed(() => {
      if (activeFilter.value === 'all') {
        return orders.value
      }

      return orders.value.filter((item) => item.status === activeFilter.value)
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
              await cancelOrder(order.id)
              Taro.showToast({ title: '取消成功', icon: 'success' })
              await loadOrders()
            } catch (error) {
              Taro.showToast({ title: error?.message || '取消失败', icon: 'none' })
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

    async function loadOrders () {
      if (isFetching.value) {
        return
      }

      isFetching.value = true
      loadError.value = null

      if (!orders.value.length) {
        isLoading.value = true
      }

      try {
        const response = await listOrders()
        orders.value = normalizeOrders(response)
      } catch (error) {
        loadError.value = error
      } finally {
        isFetching.value = false
        isLoading.value = false
      }
    }

    async function confirmOrderPaid (targetOrderId) {
      for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt += 1) {
        await loadOrders()

        const latestOrder = orders.value.find((item) => item.id === targetOrderId)

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
      await loadOrders()
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
          await loadOrders()
        }
      })()
    })

    usePullDownRefresh(async () => {
      try {
        await loadOrders()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      errorMessage,
      handleOpenDetail,
      handlePayOrder,
      handleRetry,
      filteredOrders,
      isError,
      isFetching,
      isLoading,
      orders,
      payingOrderId,
      cancellingOrderId,
      skeletonItems,
      tabs,
      activeFilter,
      handleTabChange,
      handleCancelOrder
    }
  }
}
</script>