<template>
  <view class="address-edit-page">
    <view class="edit-form">
      <view class="form-section">
        <view class="form-group">
          <label class="form-label">收货人</label>
          <input
            :value="form.contact_name"
            class="form-input"
            type="text"
            placeholder="请输入收货人姓名"
            :disabled="isSubmitting"
            @input="handleFieldInput('contact_name', $event.detail.value)"
          />
        </view>

        <view class="form-group">
          <label class="form-label">手机号</label>
          <input
            :value="form.contact_phone"
            class="form-input"
            type="text"
            placeholder="请输入手机号"
            :disabled="isSubmitting"
            @input="handleFieldInput('contact_phone', $event.detail.value)"
          />
        </view>
      </view>

      <view class="form-section">
        <text class="form-section__title">所在地区</text>

        <location-cascader
          :model-value="form"
          :disabled="isSubmitting"
          @update:model-value="handleLocationChange"
        />
      </view>

      <view class="form-section">
        <view class="form-group">
          <label class="form-label">详细地址</label>
          <textarea
            :value="form.address_detail"
            class="form-textarea"
            placeholder="请输入详细地址，如街道名称、门号、楼层等"
            :disabled="isSubmitting"
            @input="handleFieldInput('address_detail', $event.detail.value)"
          />
        </view>

        <view class="form-group">
          <label class="form-label">邮编</label>
          <input
            :value="form.postal_code"
            class="form-input"
            type="text"
            placeholder="请输入邮编（可选）"
            :disabled="isSubmitting"
            @input="handleFieldInput('postal_code', $event.detail.value)"
          />
        </view>
      </view>

      <view class="form-section">
        <view class="form-group form-group--checkbox">
          <view class="checkbox-wrapper">
            <label class="checkbox-label">
              <switch
                :checked="Boolean(form.is_default)"
                class="checkbox-input"
                :disabled="isSubmitting"
                @change="handleDefaultChange"
              />
              <text class="checkbox-text">设为默认地址</text>
            </label>
          </view>
        </view>
      </view>
    </view>

    <view class="edit-footer">
      <button class="edit-footer__button edit-footer__button--cancel" :disabled="isSubmitting" @tap="handleCancel">取消</button>
      <button class="edit-footer__button edit-footer__button--save" :loading="isSubmitting" @tap="handleSave">{{ isEditing ? '更新地址' : '新增地址' }}</button>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { getCurrentInstance } from '@tarojs/taro'

import { createUserAddress, getUserAddress, updateUserAddress } from '@/api/user-addresses'
import { addressNamesToCodes, addressCodesToNames } from '@/utils/location'

import LocationCascader from '@/components/LocationCascader'

import './index.scss'

const DEFAULT_FORM = {
  contact_name: '',
  contact_phone: '',
  province: '',
  city: '',
  district: '',
  address_detail: '',
  postal_code: '',
  is_default: false
}

export default {
  components: {
    LocationCascader
  },
  setup () {
    const form = ref({ ...DEFAULT_FORM })
    const addressId = ref(null)
    const isLoading = ref(false)
    const isSubmitting = ref(false)

    const isEditing = computed(() => Boolean(addressId.value))

    function patchForm (patch) {
      Object.assign(form.value, patch)
    }

    function handleFieldInput (field, value) {
      form.value[field] = value
    }

    function handleLocationChange (nextValue) {
      patchForm({
        province: nextValue?.province || '',
        city: nextValue?.city || '',
        district: nextValue?.district || ''
      })
    }

    function handleDefaultChange (event) {
      form.value.is_default = Boolean(event?.detail?.value)
    }

    async function loadAddressDetail () {
      if (!addressId.value) {
        return
      }

      isLoading.value = true

      try {
        const address = await getUserAddress(addressId.value)
        const addressWithCodes = addressNamesToCodes(address)

        patchForm({
          contact_name: addressWithCodes.contact_name || '',
          contact_phone: addressWithCodes.contact_phone || '',
          province: addressWithCodes.province || '',
          city: addressWithCodes.city || '',
          district: addressWithCodes.district || '',
          address_detail: addressWithCodes.address_detail || '',
          postal_code: addressWithCodes.postal_code || '',
          is_default: addressWithCodes.is_default || false
        })
      } catch (error) {
        console.error('[address-edit] load detail failed', error)
        Taro.showToast({
          title: error?.message || '加载地址失败',
          icon: 'none'
        })
      } finally {
        isLoading.value = false
      }
    }

    function validateForm () {
      const { contact_name, contact_phone, province, city, district, address_detail } = form.value

      if (!contact_name?.trim()) {
        Taro.showToast({
          title: '请输入收货人',
          icon: 'none'
        })
        return false
      }

      if (!contact_phone?.trim()) {
        Taro.showToast({
          title: '请输入手机号',
          icon: 'none'
        })
        return false
      }

      if (!province?.trim() || !city?.trim() || !district?.trim()) {
        Taro.showToast({
          title: '请选择完整地区',
          icon: 'none'
        })
        return false
      }

      if (!address_detail?.trim()) {
        Taro.showToast({
          title: '请输入详细地址',
          icon: 'none'
        })
        return false
      }

      return true
    }

    async function handleSave () {
      if (!validateForm() || isSubmitting.value) {
        return
      }

      isSubmitting.value = true

      try {
        // Convert codes back to names for API
        const formWithNames = addressCodesToNames(form.value)

        if (isEditing.value) {
          await updateUserAddress(addressId.value, formWithNames)
          Taro.showToast({
            title: '地址已更新',
            icon: 'success'
          })
        } else {
          await createUserAddress(formWithNames)
          Taro.showToast({
            title: '地址已保存',
            icon: 'success'
          })
        }

        // 延迟后返回
        setTimeout(() => {
          Taro.navigateBack()
        }, 1000)
      } catch (error) {
        console.error('[address-edit] save failed', error)
        Taro.showToast({
          title: error?.message || '保存失败',
          icon: 'none'
        })
      } finally {
        isSubmitting.value = false
      }
    }

    function handleCancel () {
      Taro.navigateBack()
    }

    const instance = getCurrentInstance()
    const params = instance?.router?.params || {}

    addressId.value = params.id || null

    if (addressId.value) {
      void loadAddressDetail()
    }

    return {
      addressId,
      form,
      handleDefaultChange,
      handleCancel,
      handleFieldInput,
      handleLocationChange,
      handleSave,
      isEditing,
      isLoading,
      isSubmitting
    }
  }
}
</script>