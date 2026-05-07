<template>
  <view class="order-confirm-page">
    <view v-if="isPageLoading" class="confirm-skeleton">
      <view class="skeleton-address"></view>
      <view class="skeleton-product"></view>
      <view class="skeleton-price"></view>
    </view>

    <EmptyStatePanel
      v-else-if="pageState"
      :badge-text="pageState.badgeText"
      :title="pageState.title"
      :description="pageState.description"
      :action-text="pageState.actionText"
      @action="handlePageStateAction"
    />

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

    <view v-if="!pageState" class="bottom-bar">
      <view class="bottom-left">
        <text class="bottom-count">共{{ totalQuantity }}件</text>
        <text class="bottom-money">¥{{ totalPrice }}</text>
      </view>
      <button class="bottom-btn" :disabled="!selectedAddressId || isSubmitting" :loading="isSubmitting" @tap="handleSubmitOrder">提交订单 ¥{{ totalPrice }}</button>
    </view>
  </view>
</template>

<script>
import { computed, ref, watch } from 'vue'
import Taro, { useDidShow, getCurrentInstance } from '@tarojs/taro'
import { useAppQuery } from '@/utils/app-query'

import EmptyStatePanel from '@/components/EmptyStatePanel.vue'
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

function validateCartItems(items) {
  if (!items || items.length === 0) return false
  const hasValidQuantity = items.every(item => item.quantity >= 1)
  return hasValidQuantity
}

function buildAddressPayload (address) {
  return {
    contact_name: address.contact_name,
    contact_phone: address.contact_phone,
    province: address.province,
    city: address.city,
    district: address.district,
    address_detail: address.address_detail,
    postal_code: address.postal_code
  }
}

export default {
  components: {
    EmptyStatePanel
  },

  setup() {
    const cartStore = useCartStore()
    const selectedAddressId = ref(null)
    const remark = ref('')
    const isSubmitting = ref(false)
    const fromCart = ref(false)
    const selectedItemIds = ref([])
    const pageReady = ref(false)

    const pageParams = ref({
      productId: '',
      quantity: 1
    })

    const {
      data: addresses,
      isLoading: addressesLoading
    } = useAppQuery({
      queryKey: ['user-addresses', 'select'],
      queryFn: async () => {
        const response = await listUserAddresses()
        return Array.isArray(response) ? response : []
      }
    })

    const {
      data: product,
      isLoading: productLoading,
      isFetching: productFetching,
      isError: productError,
      status: productStatus
    } = useAppQuery({
      queryKey: computed(() => ['products', 'detail', pageParams.value.productId]),
      queryFn: async () => {
        const response = await getSaleProductDetail(pageParams.value.productId)
        return response ? {
          ...response,
          coverImage: response.image || response.product_image || ''
        } : null
      },
      enabled: computed(() => Boolean(pageParams.value.productId) && !fromCart.value)
    })

    const orderMode = computed(() => {
      if (!pageReady.value) {
        return 'pending'
      }

      if (fromCart.value) {
        return 'cart'
      }

      if (pageParams.value.productId) {
        return 'single'
      }

      return 'invalid'
    })

    const isPageLoading = computed(() => {
      if (!pageReady.value) {
        return true
      }

      if (addressesLoading.value) {
        return true
      }

      return orderMode.value === 'single' && (productLoading.value || productFetching.value)
    })

    const cartItems = computed(() => {
      if (orderMode.value === 'cart') {
        if (selectedItemIds.value.length > 0) {
          return cartStore.cartItems.filter(item => selectedItemIds.value.includes(item.id))
        }

        return cartStore.cartItems
      }

      if (orderMode.value === 'single' && product.value) {
        return [{
          id: product.value.id,
          name: product.value.name,
          price: product.value.price,
          quantity: pageParams.value.quantity,
          specification: product.value.specification,
          coverImage: product.value.image || product.value.product_image || ''
        }]
      }

      return []
    })

    const pageState = computed(() => {
      if (!pageReady.value || isPageLoading.value) {
        return null
      }

      if (orderMode.value === 'invalid') {
        return {
          badgeText: 'MODE',
          title: '下单参数缺失',
          description: '当前页面没有识别到单商品或购物车下单模式，请返回上一页重新进入。',
          actionText: '返回上一页'
        }
      }

      if (orderMode.value === 'single' && (productStatus.value === 'error' || (productStatus.value === 'success' && !product.value))) {
        return {
          badgeText: 'PRODUCT',
          title: '商品信息加载失败',
          description: '当前商品详情未能成功加载，暂时无法提交订单。你可以返回商品页后重新进入。',
          actionText: '返回上一页'
        }
      }

      if (orderMode.value === 'cart' && cartItems.value.length === 0) {
        return {
          badgeText: 'CART',
          title: '没有可结算的商品',
          description: '当前没有读取到购物车结算项，请先回到购物车勾选商品后再提交订单。',
          actionText: '前往购物车'
        }
      }

      return null
    })

    watch(addresses, (newAddresses) => {
      if (newAddresses && newAddresses.length > 0 && !selectedAddressId.value) {
        const defaultAddress = newAddresses.find((a) => a.is_default)
        selectedAddressId.value = defaultAddress?.id || newAddresses[0]?.id || null
      }
    }, { immediate: true })

    const selectedAddress = computed(() => {
      return (addresses.value || []).find((a) => a.id === selectedAddressId.value) || null
    })

    const totalQuantity = computed(() => {
      return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
    })

    const totalPrice = computed(() => {
      const amount = cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      return formatPrice(amount)
    })

    function handlePageStateAction () {
      if (orderMode.value === 'cart') {
        Taro.switchTab({
          url: '/pages/cart/index'
        })
        return
      }

      Taro.navigateBack({
        fail: () => {
          Taro.switchTab({
            url: '/pages/products/index'
          })
        }
      })
    }

    function getSubmitValidationMessage () {
      if (pageState.value) {
        if (orderMode.value === 'cart') {
          return '请先选择要结算的商品'
        }

        return '商品信息加载失败'
      }

      if (isPageLoading.value) {
        return '页面数据加载中'
      }

      if (!validateCartItems(cartItems.value)) {
        return orderMode.value === 'cart' ? '请先选择要结算的商品' : '商品数据异常'
      }

      if (!selectedAddress.value) {
        return '请选择收货地址'
      }

      return ''
    }

    function buildOrderRequestPayload () {
      const addressPayload = buildAddressPayload(selectedAddress.value)

      if (orderMode.value === 'cart') {
        return {
          products: cartItems.value.map((item) => ({
            id: item.id,
            quantity: item.quantity
          })),
          address: addressPayload,
          remark: remark.value
        }
      }

      return {
        productId: pageParams.value.productId,
        quantity: pageParams.value.quantity,
        address: addressPayload,
        remark: remark.value
      }
    }

    function handleSelectAddress () {
      Taro.navigateTo({
        url: ADDRESS_EDIT_PAGE_PATH
      })
    }

    async function handleDecreaseQuantity (itemId, currentQuantity) {
      const newQuantity = currentQuantity - 1
      
      if (fromCart.value) {
        if (newQuantity < 1) {
          const otherItems = cartItems.value.filter(item => item.id !== itemId)
          if (otherItems.length > 0) {
            await cartStore.removeItem(itemId)
            const index = selectedItemIds.value.indexOf(itemId)
            if (index > -1) {
              selectedItemIds.value.splice(index, 1)
            }
          } else {
            return
          }
        } else {
          await cartStore.updateQuantity(itemId, newQuantity)
        }
      } else {
        pageParams.value.quantity = Math.max(1, newQuantity)
      }
    }

    async function handleIncreaseQuantity (itemId, currentQuantity) {
      if (fromCart.value) {
        await cartStore.updateQuantity(itemId, currentQuantity + 1)
      } else {
        pageParams.value.quantity = Math.min(99, pageParams.value.quantity + 1)
      }
    }

    function handleRemarkInput (e) {
      remark.value = e.detail.value || ''
    }

    async function handleSubmitOrder () {
      const validationMessage = getSubmitValidationMessage()

      if (validationMessage) {
        Taro.showToast({ title: validationMessage, icon: 'none' })
        return
      }

      isSubmitting.value = true

      try {
        const order = await createSaleOrder(buildOrderRequestPayload())

        const paymentPayload = await createOrderPayment(order.id)
        await invokeWechatPayment(paymentPayload)

        const paidOrder = await confirmOrderPaid(order)

        if (paidOrder?.status === 'paid') {
          if (fromCart.value && selectedItemIds.value.length > 0) {
            await cartStore.clearSelected(selectedItemIds.value)
          }
          Taro.showToast({ title: '支付成功', icon: 'success' })
        } else {
          Taro.showToast({ title: '支付结果待确认，可在订单列表查看', icon: 'none' })
        }

        await sleep(1500)
        await Taro.reLaunch({ url: ORDERS_LIST_PAGE_PATH })
      } catch (error) {
        console.error('[order-confirm] order process failed', error)
        Taro.showToast({ title: error?.message || '订单处理失败', icon: 'none' })
      } finally {
        isSubmitting.value = false
      }
    }

    useDidShow(async () => {
      pageReady.value = false

      const params = getCurrentInstance()?.router?.params || {}

      fromCart.value = params.fromCart === 'true' || params.fromCart === true

      if (params.selectedIds) {
        try {
          selectedItemIds.value = JSON.parse(decodeURIComponent(params.selectedIds))
        } catch (e) {
          console.error('[order-confirm] parse selectedIds error', e)
          selectedItemIds.value = []
        }
      }

      if (fromCart.value) {
        await cartStore.hydrate()
      } else {
        pageParams.value = {
          productId: params.productId || '',
          quantity: Number(params.quantity) || 1
        }
      }

      pageReady.value = true
    })

    return {
      addresses,
      cartItems,
      formatFullAddress,
      handlePageStateAction,
      handleDecreaseQuantity,
      handleIncreaseQuantity,
      handleRemarkInput,
      handleSelectAddress,
      handleSubmitOrder,
      isSubmitting,
      isPageLoading,
      pageState,
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
