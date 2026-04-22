<template>
  <view class="cart-page">
    <view class="page-header">
      <text class="page-title">购物车</text>
    </view>

    <view class="tabs">
      <view class="tab-item" :class="{ active: currentTab === 'all' }" @tap="switchTab('all')">
        <text class="tab-text">全部</text>
        <view v-if="allCount > 0" class="tab-badge">
          <text class="tab-badge-text">{{ allCount }}</text>
        </view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 'pending' }" @tap="switchTab('pending')">
        <text class="tab-text">待付款</text>
        <view v-if="pendingCount > 0" class="tab-badge">
          <text class="tab-badge-text">{{ pendingCount }}</text>
        </view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 'paid' }" @tap="switchTab('paid')">
        <text class="tab-text">待发货</text>
        <view v-if="paidCount > 0" class="tab-badge">
          <text class="tab-badge-text">{{ paidCount }}</text>
        </view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 'shipped' }" @tap="switchTab('shipped')">
        <text class="tab-text">待收货</text>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 'completed' }" @tap="switchTab('completed')">
        <text class="tab-text">待评价</text>
      </view>
    </view>

    <view v-if="isLoading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="filteredOrders.length === 0" class="empty-state">
      <view class="empty-image"></view>
      <text class="empty-text">您暂时还没有订单哦~</text>
      <button class="empty-btn" @tap="goShopping">去选购</button>
    </view>

    <view v-else class="order-list">
      <view
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        @tap="goToOrderDetail(order)"
      >
        <view class="order-card-header">
          <text class="order-no">{{ order.order_no || ('订单 #' + order.id) }}</text>
          <text :class="['order-status', 'order-status--' + order.status]">{{ getStatusLabel(order.status) }}</text>
        </view>
        <view v-for="(item, idx) in (order.items || [])" :key="idx" class="order-product">
          <view class="order-product-image"></view>
          <view class="order-product-info">
            <text class="order-product-name">{{ item.product_name || '商品' }}</text>
            <text class="order-product-qty">x{{ item.quantity || 0 }}</text>
          </view>
          <text class="order-product-price">¥{{ formatItemPrice(item) }}</text>
        </view>
        <view class="order-card-footer">
          <text class="order-total">合计: ¥{{ formatTotalPrice(order.total_amount) }}</text>
          <view class="order-actions">
            <button
              v-if="order.status === 'pending'"
              class="order-btn order-btn--primary"
              @tap.stop="handlePay(order)"
            >去付款</button>
            <button
              class="order-btn order-btn--default"
              @tap.stop="goToOrderDetail(order)"
            >查看详情</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listOrders, createOrderPayment } from '@/api/orders'
import './index.scss'

const HOME_PAGE = '/pages/home/index'
const ORDER_DETAIL_PAGE = '/pages/orders/detail/index'

export default {
  setup() {
    const authStore = useAuthStore()
    const currentTab = ref('all')
    const orders = ref([])
    const isLoading = ref(true)

    const allCount = computed(() => orders.value.length)
    const pendingCount = computed(() => orders.value.filter(o => o.status === 'pending').length)
    const paidCount = computed(() => orders.value.filter(o => o.status === 'paid').length)

    const filteredOrders = computed(() => {
      if (currentTab.value === 'all') return orders.value
      if (currentTab.value === 'pending') return orders.value.filter(o => o.status === 'pending')
      if (currentTab.value === 'paid') return orders.value.filter(o => o.status === 'paid')
      if (currentTab.value === 'shipped') return orders.value.filter(o => o.status === 'shipped')
      if (currentTab.value === 'completed') return orders.value.filter(o => o.status === 'completed')
      return orders.value
    })

    function getStatusLabel(status) {
      const map = {
        pending: '待付款',
        paid: '待发货',
        shipped: '待收货',
        completed: '待评价',
        cancelled: '已取消',
        closed: '已关闭'
      }
      return map[status] || status || '未知'
    }

    function formatItemPrice(item) {
      const val = Number(item?.price)
      return Number.isFinite(val) ? val.toFixed(2) : '--'
    }

    function formatTotalPrice(amount) {
      const val = Number(amount)
      return Number.isFinite(val) ? val.toFixed(2) : '--'
    }

    async function loadOrders() {
      if (!authStore.isAuthenticated) {
        isLoading.value = false
        return
      }
      isLoading.value = true
      try {
        const response = await listOrders()
        const list = Array.isArray(response) ? response : []
        orders.value = list.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
      } catch (e) {
        orders.value = []
      } finally {
        isLoading.value = false
      }
    }

    useDidShow(() => {
      authStore.hydrate()
      void loadOrders()
    })

    Taro.eventCenter.on('switchCartTab', (tab) => {
      currentTab.value = tab
    })

    function switchTab(tab) {
      currentTab.value = tab
    }

    function goShopping() {
      Taro.switchTab({
        url: HOME_PAGE
      })
    }

    function goToOrderDetail(order) {
      if (!order?.id) return
      Taro.navigateTo({
        url: `${ORDER_DETAIL_PAGE}?id=${order.id}`
      })
    }

    async function handlePay(order) {
      if (!order?.id) return
      try {
        const paymentPayload = await createOrderPayment(order.id)
        const requestPayment = paymentPayload?.request_payment || {}
        await Taro.requestPayment({
          timeStamp: requestPayment.timeStamp,
          nonceStr: requestPayment.nonceStr,
          package: requestPayment.package,
          signType: requestPayment.signType,
          paySign: requestPayment.paySign
        })
        Taro.showToast({ title: '支付成功', icon: 'success' })
        await loadOrders()
      } catch (e) {
        Taro.showToast({ title: e?.message || '支付未完成', icon: 'none' })
      }
    }

    return {
      currentTab,
      orders,
      isLoading,
      allCount,
      pendingCount,
      paidCount,
      filteredOrders,
      getStatusLabel,
      formatItemPrice,
      formatTotalPrice,
      switchTab,
      goShopping,
      goToOrderDetail,
      handlePay
    }
  }
}
</script>
