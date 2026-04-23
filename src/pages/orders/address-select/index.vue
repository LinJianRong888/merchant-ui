<template>
  <view class="address-select-page">
    <view v-if="isLoading" class="address-skeleton-list">
      <view v-for="item in skeletonItems" :key="item" class="address-card address-card--skeleton">
        <view class="skeleton-line skeleton-line--title"></view>
        <view class="skeleton-line"></view>
      </view>
    </view>

    <view v-else-if="isError" class="state-panel">
      <text class="state-panel__title">加载失败</text>
      <text class="state-panel__desc">{{ errorMessage }}</text>
      <button class="state-panel__button" :loading="isFetching" @tap="loadAddresses">重新加载</button>
    </view>

    <view v-else-if="!addresses.length" class="state-panel state-panel--empty">
      <text class="state-panel__title">还没有地址</text>
      <text class="state-panel__desc">请先添加收货地址</text>
      <button class="state-panel__button" @tap="handleAddAddress">添加地址</button>
    </view>

    <view v-else class="addresses-list">
      <view
        v-for="address in addresses"
        :key="address.id"
        class="address-card"
        :class="{ 'is-selected': selectedAddressId === address.id }"
        @tap="handleSelectAddress(address)"
      >
        <view class="address-card__radio">
          <view :class="['address-card__radio-circle', { 'is-checked': selectedAddressId === address.id }]"></view>
        </view>

        <view class="address-card__content">
          <view class="address-card__contact">
            <text class="address-card__name">{{ address.contact_name }}</text>
            <text class="address-card__phone">{{ address.contact_phone }}</text>
          </view>
          <view class="address-card__address">
            <text>{{ formatFullAddress(address) }}</text>
          </view>
          <view v-if="address.is_default" class="address-card__default-badge">默认地址</view>
        </view>
      </view>
    </view>

    <view v-if="addresses.length" class="submit-panel">
      <button class="submit-panel__button submit-panel__button--add" @tap="handleAddAddress">+ 添加新地址</button>
      <button class="submit-panel__button submit-panel__button--confirm" :disabled="!selectedAddressId" :loading="isSubmitting" @tap="handleConfirm">确认选择</button>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useDidShow, usePullDownRefresh, getCurrentInstance } from '@tarojs/taro'

import { createOrderPayment, createSaleOrder, listOrders } from '@/api/orders'
import { listUserAddresses } from '@/api/user-addresses'

import './index.scss'

const ADDRESS_EDIT_PAGE_PATH = '/pages/user/addresses/edit/index'
const ORDERS_LIST_PAGE_PATH = '/pages/orders/index'

function formatFullAddress (address) {
  const parts = [
    address.province,
    address.city,
    address.district,
    address.address_detail
  ].filter(Boolean)

  return parts.join(' ')
}

function formatQueryError (error) {
  const lines = [error?.message || '请稍后重试']

  if (error?.statusCode) {
    lines.push(`status: ${error.statusCode}`)
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

function sleep (delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}

async function confirmOrderPaid (targetOrder) {
  const PAYMENT_POLL_INTERVAL = 1500
  const PAYMENT_POLL_MAX_ATTEMPTS = 4

  for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt += 1) {
    try {
      const orders = await listOrders()

      if (!Array.isArray(orders)) {
        continue
      }

      const matchedOrder = orders.find((item) => item?.id === targetOrder?.id || item?.order_no === targetOrder?.order_no)

      if (matchedOrder?.status === 'paid') {
        return matchedOrder
      }

      if (attempt < PAYMENT_POLL_MAX_ATTEMPTS - 1) {
        await sleep(PAYMENT_POLL_INTERVAL)
      }
    } catch (error) {
      console.error('[address-select] poll order status failed', error)
    }
  }

  return null
}

export default {
  setup () {
    const skeletonItems = ['skeleton-1', 'skeleton-2', 'skeleton-3']
    const addresses = ref([])
    const selectedAddressId = ref(null)
    const isLoading = ref(true)
    const isFetching = ref(false)
    const isSubmitting = ref(false)
    const loadError = ref(null)

    // 页面参数：商品信息
    const pageParams = ref({
      productId: '',
      quantity: 1
    })

    const isError = computed(() => Boolean(loadError.value))
    const errorMessage = computed(() => formatQueryError(loadError.value))

    async function loadAddresses () {
      if (isFetching.value) {
        return
      }

      isFetching.value = true
      loadError.value = null

      if (!addresses.value.length) {
        isLoading.value = true
      }

      try {
        const response = await listUserAddresses()
        addresses.value = Array.isArray(response) ? response : []

        // 默认选择第一个地址或默认地址
        const defaultAddress = addresses.value.find((a) => a.is_default)
        selectedAddressId.value = defaultAddress?.id || addresses.value[0]?.id || null
      } catch (error) {
        loadError.value = error
      } finally {
        isFetching.value = false
        isLoading.value = false
      }
    }

    function handleSelectAddress (address) {
      selectedAddressId.value = address.id
    }

    async function handleAddAddress () {
      await Taro.navigateTo({
        url: ADDRESS_EDIT_PAGE_PATH
      })
    }

    async function handleConfirm () {
      if (!selectedAddressId.value || !pageParams.value.productId) {
        Taro.showToast({
          title: '请选择地址',
          icon: 'none'
        })
        return
      }

      isSubmitting.value = true

      try {
        const selectedAddress = addresses.value.find((a) => a.id === selectedAddressId.value)

        // 创建订单
        const order = await createSaleOrder({
          productId: pageParams.value.productId,
          quantity: pageParams.value.quantity,
          address: {
            contact_name: selectedAddress.contact_name,
            contact_phone: selectedAddress.contact_phone,
            province: selectedAddress.province,
            city: selectedAddress.city,
            district: selectedAddress.district,
            address_detail: selectedAddress.address_detail,
            postal_code: selectedAddress.postal_code
          }
        })

        console.log('[address-select] order created', order)

        // 创建支付订单
        const paymentPayload = await createOrderPayment(order.id)

        console.log('[address-select] payment created', paymentPayload)

        // 拉起微信支付
        await invokeWechatPayment(paymentPayload)

        // 轮询订单状态
        const paidOrder = await confirmOrderPaid(order)

        if (paidOrder?.status === 'paid') {
          Taro.showToast({
            title: '支付成功',
            icon: 'success'
          })
        } else {
          Taro.showToast({
            title: '支付结果待确认，可在订单列表查看',
            icon: 'none'
          })
        }

        await sleep(1500)

        await Taro.reLaunch({
          url: ORDERS_LIST_PAGE_PATH
        })
      } catch (error) {
        console.error('[address-select] order process failed', error)

        Taro.showToast({
          title: error?.message || '订单处理失败',
          icon: 'none'
        })
      } finally {
        isSubmitting.value = false
      }
    }

    useDidShow(async () => {
      // 从路由参数获取商品信息
      const params = getCurrentInstance()?.router?.params || {}

      pageParams.value = {
        productId: params.productId || '',
        quantity: Number(params.quantity) || 1
      }

      await loadAddresses()
    })

    usePullDownRefresh(async () => {
      try {
        await loadAddresses()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      addresses,
      errorMessage,
      formatFullAddress,
      handleAddAddress,
      handleConfirm,
      handleSelectAddress,
      isError,
      isFetching,
      isLoading,
      isSubmitting,
      selectedAddressId,
      skeletonItems
    }
  }
}
</script>