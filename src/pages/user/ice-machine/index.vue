<template>
  <view class="ice-machine-page">
    <view class="ice-machine-page__glow ice-machine-page__glow--top"></view>
    <view class="ice-machine-page__glow ice-machine-page__glow--bottom"></view>

    <view class="edit-form">
      <view class="form-section">
        <text class="form-section__title">申请信息</text>

        <view class="form-group">
          <label class="form-label">姓名</label>
          <input
            :value="form.name"
            class="form-input"
            type="text"
            placeholder="请输入您的姓名"
            :disabled="isSubmitting"
            @input="handleFieldInput('name', $event.detail.value)"
          />
        </view>

        <view class="form-group">
          <label class="form-label">联系电话</label>
          <input
            :value="form.phone"
            class="form-input"
            type="number"
            placeholder="请输入联系电话"
            :disabled="isSubmitting"
            @input="handleFieldInput('phone', $event.detail.value)"
          />
        </view>
      </view>

      <view class="form-section">
        <text class="form-section__title">店铺信息</text>

        <view class="form-group">
          <label class="form-label">店铺名称</label>
          <input
            :value="form.storeName"
            class="form-input"
            type="text"
            placeholder="请输入店铺名称"
            :disabled="isSubmitting"
            @input="handleFieldInput('storeName', $event.detail.value)"
          />
        </view>

        <view class="form-group">
          <label class="form-label">店铺地址</label>
          <textarea
            :value="form.storeAddress"
            class="form-textarea"
            placeholder="请输入店铺详细地址"
            :disabled="isSubmitting"
            @input="handleFieldInput('storeAddress', $event.detail.value)"
          />
        </view>

        <view class="form-group">
          <label class="form-label">店铺规模</label>
          <picker
            :value="scaleIndex"
            :range="scaleOptions"
            :disabled="isSubmitting"
            @change="handleScaleChange"
          >
            <view class="form-picker" :class="{ 'form-picker--placeholder': !form.storeScale }">
              {{ form.storeScale || '请选择店铺规模' }}
            </view>
          </picker>
        </view>
      </view>

      <view class="form-section">
        <text class="form-section__title">备注</text>
        <view class="form-group">
          <textarea
            :value="form.remark"
            class="form-textarea"
            placeholder="如有其他需求，请在此填写（可选）"
            :disabled="isSubmitting"
            @input="handleFieldInput('remark', $event.detail.value)"
          />
        </view>
      </view>
    </view>

    <view class="edit-footer">
      <button class="edit-footer__button edit-footer__button--cancel" :disabled="isSubmitting" @tap="handleCancel">取消</button>
      <button class="edit-footer__button edit-footer__button--save" :loading="isSubmitting" @tap="handleSubmit">提交申请</button>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import './index.scss'

const SCALE_OPTIONS = ['小型（1-5人）', '中型（6-20人）', '大型（20人以上）']

const DEFAULT_FORM = {
  name: '',
  phone: '',
  storeName: '',
  storeAddress: '',
  storeScale: '',
  remark: ''
}

const STORAGE_KEY = 'ice_machine_application'

export default {
  setup() {
    const form = ref({ ...DEFAULT_FORM })
    const isSubmitting = ref(false)
    const scaleOptions = ref(SCALE_OPTIONS)
    const scaleIndex = ref(-1)

    function handleFieldInput(field, value) {
      form.value[field] = value
    }

    function handleScaleChange(e) {
      const idx = Number(e.detail.value)
      scaleIndex.value = idx
      form.value.storeScale = SCALE_OPTIONS[idx] || ''
    }

    function validateForm() {
      const { name, phone, storeName, storeAddress, storeScale } = form.value

      if (!name?.trim()) {
        Taro.showToast({ title: '请输入姓名', icon: 'none' })
        return false
      }

      if (!phone?.trim()) {
        Taro.showToast({ title: '请输入联系电话', icon: 'none' })
        return false
      }

      if (!/^1\d{10}$/.test(phone.trim())) {
        Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return false
      }

      if (!storeName?.trim()) {
        Taro.showToast({ title: '请输入店铺名称', icon: 'none' })
        return false
      }

      if (!storeAddress?.trim()) {
        Taro.showToast({ title: '请输入店铺地址', icon: 'none' })
        return false
      }

      if (!storeScale) {
        Taro.showToast({ title: '请选择店铺规模', icon: 'none' })
        return false
      }

      return true
    }

    async function handleSubmit() {
      if (!validateForm() || isSubmitting.value) {
        return
      }

      isSubmitting.value = true

      try {
        const application = {
          ...form.value,
          createdAt: new Date().toISOString()
        }

        Taro.setStorageSync(STORAGE_KEY, application)

        Taro.showToast({
          title: '申请已提交',
          icon: 'success'
        })

        setTimeout(() => {
          Taro.navigateBack()
        }, 1000)
      } catch (error) {
        Taro.showToast({
          title: '提交失败，请重试',
          icon: 'none'
        })
      } finally {
        isSubmitting.value = false
      }
    }

    function handleCancel() {
      Taro.navigateBack()
    }

    return {
      form,
      isSubmitting,
      scaleOptions,
      scaleIndex,
      handleFieldInput,
      handleScaleChange,
      handleSubmit,
      handleCancel
    }
  }
}
</script>
