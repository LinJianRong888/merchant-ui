<template>
  <view class="orders-page">
    <view class="orders-page__glow orders-page__glow--top"></view>
    <view class="orders-page__glow orders-page__glow--bottom"></view>

    <view class="orders-page__header">
      <view class="orders-page__heading">
        <text class="orders-page__eyebrow">order ledger</text>
        <text class="orders-page__title">订单管理</text>
      </view>

      <view class="orders-stats">
        <view class="orders-stats__item">
          <text class="orders-stats__label">总订单</text>
          <text class="orders-stats__value">{{ totalCountText }}</text>
        </view>
        <view class="orders-stats__item">
          <text class="orders-stats__label">待支付</text>
          <text class="orders-stats__value">{{ pendingCountText }}</text>
        </view>
        <view class="orders-stats__item">
          <text class="orders-stats__label">已支付</text>
          <text class="orders-stats__value">{{ paidCountText }}</text>
        </view>
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
        <view class="order-card__topline">
          <view class="order-card__meta-block">
            <text class="order-card__order-no">{{ order.orderNoText }}</text>
            <text class="order-card__time">{{ order.createdAtText }}</text>
          </view>
          <text :class="['order-card__badge', order.statusClass]">{{ order.statusLabel }}</text>
        </view>

        <view class="order-items">
          <view v-for="(item, itemIndex) in order.items" :key="`${order.id}-${itemIndex}`" class="order-item">
            <text class="order-item__name">{{ item.product_name || '商品' }}</text>
            <text class="order-item__qty">x{{ item.quantity || 0 }}</text>
          </view>
        </view>

        <view class="order-card__footer">
          <text class="order-card__amount">{{ order.totalAmountText }}</text>
          <button
            v-if="order.canPay"
            class="order-card__action"
            :loading="payingOrderId === order.id"
            @tap.stop="handlePayOrder(order)"
          >继续支付</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useDidShow, useLoad, usePullDownRefresh } from '@tarojs/taro'

import { createOrderPayment, listOrders } from '@/api/orders'
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

    const isError = computed(() => Boolean(loadError.value))
    const errorMessage = computed(() => formatQueryError(loadError.value))
    const filteredOrders = computed(() => {
      if (activeFilter.value === 'all') {
        return orders.value
      }

      return orders.value.filter((item) => item.status === activeFilter.value)
    })
    const totalCountText = computed(() => String(orders.value.length))
    const pendingCountText = computed(() => String(orders.value.filter((item) => item.status === 'pending').length))
    const paidCountText = computed(() => String(orders.value.filter((item) => item.status === 'paid').length))

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
      paidCountText,
      payingOrderId,
      pendingCountText,
      skeletonItems,
      totalCountText
    }
  }
}
</script>