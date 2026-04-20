<template>
  <view class="address-edit-page">
    <view class="address-edit-page__glow address-edit-page__glow--top"></view>
    <view class="address-edit-page__glow address-edit-page__glow--bottom"></view>

    <view class="edit-form">
      <view class="form-section">
        <view class="form-group">
          <label class="form-label">收货人</label>
          <input
            v-model="form.contact_name"
            class="form-input"
            type="text"
            placeholder="请输入收货人姓名"
            :disabled="isSubmitting"
          />
        </view>

        <view class="form-group">
          <label class="form-label">手机号</label>
          <input
            v-model="form.contact_phone"
            class="form-input"
            type="text"
            placeholder="请输入手机号"
            :disabled="isSubmitting"
          />
        </view>
      </view>

      <view class="form-section">
        <text class="form-section__title">所在地区</text>

        <view class="form-group">
          <label class="form-label">省份</label>
          <input
            v-model="form.province"
            class="form-input"
            type="text"
            placeholder="如：广东省"
            :disabled="isSubmitting"
          />
        </view>

        <view class="form-group">
          <label class="form-label">城市</label>
          <input
            v-model="form.city"
            class="form-input"
            type="text"
            placeholder="如：广州市"
            :disabled="isSubmitting"
          />
        </view>

        <view class="form-group">
          <label class="form-label">区县</label>
          <input
            v-model="form.district"
            class="form-input"
            type="text"
            placeholder="如：天河区"
            :disabled="isSubmitting"
          />
        </view>
      </view>

      <view class="form-section">
        <view class="form-group">
          <label class="form-label">详细地址</label>
          <textarea
            v-model="form.address_detail"
            class="form-textarea"
            placeholder="请输入详细地址，如街道名称、门号、楼层等"
            :disabled="isSubmitting"
          />
        </view>

        <view class="form-group">
          <label class="form-label">邮编</label>
          <input
            v-model="form.postal_code"
            class="form-input"
            type="text"
            placeholder="请输入邮编（可选）"
            :disabled="isSubmitting"
          />
        </view>
      </view>

      <view class="form-section">
        <view class="form-group form-group--checkbox">
          <view class="checkbox-wrapper">
            <label class="checkbox-label">
              <input
                v-model="form.is_default"
                type="checkbox"
                class="checkbox-input"
                :disabled="isSubmitting"
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
  setup () {
    const form = ref({ ...DEFAULT_FORM })
    const addressId = ref(null)
    const isLoading = ref(false)
    const isSubmitting = ref(false)

    const isEditing = computed(() => Boolean(addressId.value))

    async function loadAddressDetail () {
      if (!addressId.value) {
        return
      }

      isLoading.value = true

      try {
        const address = await getUserAddress(addressId.value)
        form.value = {
          contact_name: address.contact_name || '',
          contact_phone: address.contact_phone || '',
          province: address.province || '',
          city: address.city || '',
          district: address.district || '',
          address_detail: address.address_detail || '',
          postal_code: address.postal_code || '',
          is_default: address.is_default || false
        }
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
        if (isEditing.value) {
          await updateUserAddress(addressId.value, form.value)
          Taro.showToast({
            title: '地址已更新',
            icon: 'success'
          })
        } else {
          await createUserAddress(form.value)
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
      handleCancel,
      handleSave,
      isEditing,
      isLoading,
      isSubmitting
    }
  }
}
</script>