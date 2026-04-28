<template>
  <view class="order-confirm-page">
    <view v-if="isLoading" class="confirm-skeleton">
      <view class="skeleton-address"></view>
      <view class="skeleton-product"></view>
      <view class="skeleton-price"></view>
    </view>

    <view v-else class="confirm-content">
      <view class="address-section" @tap="handleSelectAddress">
        <view v-if="selectedAddress" class="address-info">
          <view class="address-contact">
            <text class="address-name">{{ selectedAddress.contact_name }}</text>
            <text class="address-phone">{{ selectedAddress.contact_phone }}</text>
          </view>
          <text class="address-detail">{{ formatFullAddress(selectedAddress) }}</text>
        </view>
        <view v-else class="address-placeholder">
          <text class="placeholder-text">请添加地址</text>
          <view class="import-btn">
            <text class="import-icon">📱</text>
            <text class="import-text">一键导入</text>
          </view>
        </view>
        <text class="arrow-icon">›</text>
      </view>

      <view class="shipping-section">
        <text class="shipping-label">发货方式</text>
        <view class="shipping-value">
          <text class="shipping-text">快递</text>
          <text class="arrow-icon">›</text>
        </view>
      </view>

      <view class="goods-section">
        <view v-for="(item, index) in cartItems" :key="item.id" class="goods-card">
          <image class="goods-image" :src="item.coverImage || ''" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ item.name || '商品名称' }}</text>
            <text class="goods-spec">{{ item.specification || '均码80-120' }}</text>
            <view class="goods-bottom">
              <text class="goods-price">¥{{ item.price || '79.9' }}</text>
              <view class="quantity-box">
                <view class="qty-btn" @tap="handleDecreaseQuantity(item.id, item.quantity)">−</view>
                <text class="qty-num">{{ item.quantity }}</text>
                <view class="qty-btn" @tap="handleIncreaseQuantity(item.id, item.quantity)">+</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="price-list">
        <view class="price-item">
          <text class="price-label">商品总金额</text>
          <view class="price-right">
            <text class="price-tag">共{{ totalQuantity }}件</text>
            <text class="price-val">¥{{ totalPrice }}</text>
          </view>
        </view>
        <view class="price-item">
          <text class="price-label">运费</text>
          <text class="price-val price-gray">--</text>
        </view>
        <view class="price-item price-item--total">
          <text class="price-label">实付金额</text>
          <text class="price-val price-red">¥{{ totalPrice }}</text>
        </view>
      </view>

      <view class="remark-box">
        <text class="remark-title">留言（选填）</text>
        <input class="remark-field" placeholder="选填，建议填写" :value="remark" @input="handleRemarkInput" />
        <text class="remark-camera">📷</text>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bottom-left">
        <text class="bottom-count">共{{ totalQuantity }}件</text>
        <text class="bottom-money">¥{{ totalPrice }}</text>
      </view>
      <button class="bottom-btn" :disabled="!selectedAddressId || isSubmitting" :loading="isSubmitting" @tap="handleSubmitOrder">提交订单 ¥{{ totalPrice }}</button>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { useDidShow, getCurrentInstance } from '@tarojs/taro'

import { createOrderPayment, createSaleOrder } from '@/api/orders'
import { getSaleProductDetail } from '@/api/products'
import { listUserAddresses } from '@/api/user-addresses'
import { useCartStore } from '@/stores/cart'

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

function formatPrice (price) {
  const value = Number(price)
  return Number.isFinite(value) ? value.toFixed(1) : '0.0'
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
  const { listOrders } = require('@/api/orders')
  const PAYMENT_POLL_INTERVAL = 1500
  const PAYMENT_POLL_MAX_ATTEMPTS = 4

  for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt += 1) {
    try {
      const orders = await listOrders()

      if (!Array.isArray(orders)) {
        continue
      }

      const matchedOrder = orders.find((item) => item?.id === targetOrder?.id || item?.order_no === targetOrder?.order_no)

      if (matchedOrder?.status === 'paid') { return matchedOrder }

      if (attempt < PAYMENT_POLL_MAX_ATTEMPTS - 1) { await sleep(PAYMENT_POLL_INTERVAL) }
    } catch (error) {
      console.error('[order-confirm] poll order status failed', error)
    }
  }

  return null
}

export default {
  setup () {
    const cartStore = useCartStore()
    const addresses = ref([])
    const selectedAddressId = ref(null)
    const product = ref(null)
    const remark = ref('')
    const isLoading = ref(true)
    const isSubmitting = ref(false)
    const fromCart = ref(false)

    const pageParams = ref({
      productId: '',
      quantity: 1
    })

    const cartItems = computed(() => cartStore.cartItems)

    const selectedAddress = computed(() => {
      return addresses.value.find((a) => a.id === selectedAddressId.value) || null
    })

    const totalQuantity = computed(() => cartStore.cartTotalCount)

    const totalPrice = computed(() => {
      const amount = cartStore.cartTotalAmount
      return formatPrice(amount)
    })

    async function loadProductDetail () {
      if (!pageParams.value.productId || fromCart.value) {
        return
      }

      try {
        const response = await getSaleProductDetail(pageParams.value.productId)
        product.value = response ? {
          ...response,
          coverImage: response.image || response.product_image || ''
        } : null
      } catch (error) {
        console.error('[order-confirm] load product failed', error)
      }
    }

    async function loadAddresses () {
      try {
        const response = await listUserAddresses()
        addresses.value = Array.isArray(response) ? response : []

        const defaultAddress = addresses.value.find((a) => a.is_default)
        selectedAddressId.value = defaultAddress?.id || addresses.value[0]?.id || null
      } catch (error) {
        console.error('[order-confirm] load addresses failed', error)
      }
    }

    function handleSelectAddress () {
      Taro.navigateTo({
        url: ADDRESS_EDIT_PAGE_PATH
      })
    }

    async function handleDecreaseQuantity (itemId, currentQuantity) {
      await cartStore.updateQuantity(itemId, currentQuantity - 1)
    }

    async function handleIncreaseQuantity (itemId, currentQuantity) {
      await cartStore.updateQuantity(itemId, currentQuantity + 1)
    }

    function handleRemarkInput (e) {
      remark.value = e.detail.value || ''
    }

    async function handleSubmitOrder () {
      if (!selectedAddressId.value || (!fromCart.value && !pageParams.value.productId) || (fromCart.value && !cartItems.value.length)) {
        Taro.showToast({
          title: '请选择收货地址',
          icon: 'none'
        })
        return
      }

      isSubmitting.value = true

      try {
        const selectedAddr = addresses.value.find((a) => a.id === selectedAddressId.value)

        let order
        if (fromCart.value) {
          const firstItem = cartItems.value[0]
          order = await createSaleOrder({
            productId: firstItem.id,
            quantity: firstItem.quantity,
            address: {
              contact_name: selectedAddr.contact_name,
              contact_phone: selectedAddr.contact_phone,
              province: selectedAddr.province,
              city: selectedAddr.city,
              district: selectedAddr.district,
              address_detail: selectedAddr.address_detail,
              postal_code: selectedAddr.postal_code
            },
            remark: remark.value
          })
        } else {
          order = await createSaleOrder({
            productId: pageParams.value.productId,
            quantity: pageParams.value.quantity,
            address: {
              contact_name: selectedAddr.contact_name,
              contact_phone: selectedAddr.contact_phone,
              province: selectedAddr.province,
              city: selectedAddr.city,
              district: selectedAddr.district,
              address_detail: selectedAddr.address_detail,
              postal_code: selectedAddr.postal_code
            },
            remark: remark.value
          })
        }

        console.log('[order-confirm] order created', order)

        const paymentPayload = await createOrderPayment(order.id)

        console.log('[order-confirm] payment created', paymentPayload)

        await invokeWechatPayment(paymentPayload)

        const paidOrder = await confirmOrderPaid(order)

        if (paidOrder?.status === 'paid') {
          if (fromCart.value) { await cartStore.clear() }
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
        console.error('[order-confirm] order process failed', error)

        Taro.showToast({
          title: error?.message || '订单处理失败',
          icon: 'none'
        })
      } finally {
        isSubmitting.value = false
      }
    }

    useDidShow(async () => {
      const params = getCurrentInstance()?.router?.params || {}

      fromCart.value = params.fromCart === 'true' || params.fromCart === true

      if (fromCart.value) {
        await cartStore.hydrate()
      } else {
        pageParams.value = {
          productId: params.productId || '',
          quantity: Number(params.quantity) || 1
        }
      }

      isLoading.value = true

      await Promise.all([
        loadProductDetail(),
        loadAddresses()
      ])

      isLoading.value = false
    })

    return {
      addresses,
      cartItems,
      formatFullAddress,
      handleDecreaseQuantity,
      handleIncreaseQuantity,
      handleRemarkInput,
      handleSelectAddress,
      handleSubmitOrder,
      isSubmitting,
      isLoading,
      product,
      remark,
      selectedAddress,
      selectedAddressId,
      totalPrice,
      totalQuantity
    }
  }
}
</script>
