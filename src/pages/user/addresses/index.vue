<template>
  <view class="addresses-page">
    <view class="addresses-header">
      <text class="addresses-header__title">收货地址</text>
      <button class="addresses-header__add" @tap="handleAddAddress">+ 新增地址</button>
    </view>

    <view v-if="isLoading" class="address-skeleton-list">
      <view v-for="item in skeletonItems" :key="item" class="address-card address-card--skeleton">
        <view class="skeleton-line skeleton-line--title"></view>
        <view class="skeleton-line"></view>
        <view class="skeleton-line short"></view>
      </view>
    </view>

    <view v-else-if="isError" class="addresses-state-panel">
      <text class="addresses-state-panel__title">加载失败</text>
      <text class="addresses-state-panel__desc">{{ errorMessage }}</text>
      <button class="addresses-state-panel__button" :loading="isFetching" @tap="handleRetry">重新加载</button>
    </view>

    <view v-else-if="!addresses.length" class="addresses-state-panel addresses-state-panel--empty">
      <text class="addresses-state-panel__title">还没有地址</text>
      <text class="addresses-state-panel__desc">添加一个收货地址，方便下单时选择。</text>
      <button class="addresses-state-panel__button" @tap="handleAddAddress">添加地址</button>
    </view>

    <view v-else class="addresses-list">
      <view v-for="address in addresses" :key="address.id" class="address-card" @tap="handleEditAddress(address)">
        <view class="address-card__header">
          <view class="address-card__contact">
            <text class="address-card__name">{{ address.contact_name }}</text>
            <text class="address-card__phone">{{ address.contact_phone }}</text>
          </view>
          <view v-if="address.is_default" class="address-card__badge">默认</view>
        </view>

        <view class="address-card__address">
          <text class="address-card__full-address">{{ formatFullAddress(address) }}</text>
        </view>

        <view class="address-card__actions">
          <button class="address-card__action address-card__action--edit" @tap.stop="handleEditAddress(address)">编辑</button>
          <button class="address-card__action address-card__action--delete" @tap.stop="handleDeleteAddress(address)">删除</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed } from 'vue'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useAppMutation, useAppQuery } from '@/utils/app-query'

import { listUserAddresses, deleteUserAddress } from '@/api/user-addresses'

import './index.scss'

const EDIT_ADDRESS_PAGE_PATH = '/pages/user/addresses/edit/index'

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

export default {
  setup () {
    const skeletonItems = ['skeleton-1', 'skeleton-2', 'skeleton-3']

    const {
      data: addresses,
      isLoading,
      isFetching,
      isError,
      error,
      refetch
    } = useAppQuery({
      queryKey: ['user-addresses'],
      queryFn: async () => {
        const response = await listUserAddresses()
        return Array.isArray(response) ? response : []
      }
    })

    const addressList = computed(() => addresses.value || [])
    const errorMessage = computed(() => formatQueryError(error.value))

    const deleteMutation = useAppMutation({
      mutationFn: (addressId) => deleteUserAddress(addressId),
      onSuccess: () => {
        Taro.showToast({ title: '删除成功', icon: 'success' })
        void refetch()
      },
      onError: (error) => {
        Taro.showToast({ title: error?.message || '删除失败', icon: 'none' })
      }
    })

    async function handleRetry () {
      await refetch()
    }

    async function handleAddAddress () {
      await Taro.navigateTo({
        url: EDIT_ADDRESS_PAGE_PATH
      })
    }

    async function handleEditAddress (address) {
      await Taro.navigateTo({
        url: `${EDIT_ADDRESS_PAGE_PATH}?id=${address.id}`
      })
    }

    async function handleDeleteAddress (address) {
      Taro.showModal({
        title: '确认删除',
        content: `确定要删除 ${address.contact_name} 的地址吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteMutation.mutateAsync(address.id)
            } catch (error) {
              // 错误已在 mutation onError 中处理
            }
          }
        }
      })
    }

    useDidShow(async () => {
      await refetch()
    })

    usePullDownRefresh(async () => {
      try {
        await refetch()
      } finally {
        Taro.stopPullDownRefresh()
      }
    })

    return {
      addresses: addressList,
      errorMessage,
      formatFullAddress,
      handleAddAddress,
      handleDeleteAddress,
      handleEditAddress,
      handleRetry,
      isError,
      isFetching,
      isLoading,
      skeletonItems
    }
  }
}
</script>
