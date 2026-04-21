<template>
  <view class="location-cascader">
    <view class="form-group">
      <label class="form-label">省份</label>
      <picker
        mode="selector"
        :range="provinceOptions"
        range-key="label"
        :value="provinceIndex"
        :disabled="disabled"
        @change="handleProvinceChange"
      >
        <view class="picker-field" :class="{ 'picker-field--empty': !selectedProvinceLabel }">
          <text>{{ selectedProvinceLabel || '请选择省份' }}</text>
        </view>
      </picker>
    </view>

    <view class="form-group" v-show="cityOptions.length">
      <label class="form-label">城市</label>
      <picker
        mode="selector"
        :range="cityOptions"
        range-key="label"
        :value="cityIndex"
        :disabled="disabled"
        @change="handleCityChange"
      >
        <view class="picker-field" :class="{ 'picker-field--empty': !selectedCityLabel }">
          <text>{{ selectedCityLabel || '请选择城市' }}</text>
        </view>
      </picker>
    </view>

    <view class="form-group" v-show="districtOptions.length">
      <label class="form-label">区县</label>
      <picker
        mode="selector"
        :range="districtOptions"
        range-key="label"
        :value="districtIndex"
        :disabled="disabled"
        @change="handleDistrictChange"
      >
        <view class="picker-field" :class="{ 'picker-field--empty': !selectedDistrictLabel }">
          <text>{{ selectedDistrictLabel || '请选择区县' }}</text>
        </view>
      </picker>
    </view>
  </view>
</template>

<script>
import { computed } from 'vue'

import { pcaa } from '@/data/pcaa'

const ROOT_CODE = '86'

const PROVINCES_CACHE = Object.entries(pcaa[ROOT_CODE] || {}).map(([value, label]) => ({
  value,
  label
}))

export default {
  name: 'LocationCascader',
  props: {
    modelValue: {
      type: Object,
      required: true
    },
    disabled: Boolean
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const provinceOptions = computed(() => PROVINCES_CACHE)

    const cityOptions = computed(() => {
      const code = props.modelValue.province
      if (!code || !pcaa[code]) return []

      return Object.entries(pcaa[code]).map(([value, label]) => ({
        value,
        label
      }))
    })

    const districtOptions = computed(() => {
      const code = props.modelValue.city
      if (!code || !pcaa[code]) return []

      return Object.entries(pcaa[code]).map(([value, label]) => ({
        value,
        label
      }))
    })

    const provinceIndex = computed(() => {
      const index = provinceOptions.value.findIndex((option) => option.value === props.modelValue.province)
      return index >= 0 ? index : 0
    })

    const cityIndex = computed(() => {
      const index = cityOptions.value.findIndex((option) => option.value === props.modelValue.city)
      return index >= 0 ? index : 0
    })

    const districtIndex = computed(() => {
      const index = districtOptions.value.findIndex((option) => option.value === props.modelValue.district)
      return index >= 0 ? index : 0
    })

    const selectedProvinceLabel = computed(() => {
      return provinceOptions.value.find((option) => option.value === props.modelValue.province)?.label || ''
    })

    const selectedCityLabel = computed(() => {
      return cityOptions.value.find((option) => option.value === props.modelValue.city)?.label || ''
    })

    const selectedDistrictLabel = computed(() => {
      return districtOptions.value.find((option) => option.value === props.modelValue.district)?.label || ''
    })

    const handleProvinceChange = (event) => {
      const option = provinceOptions.value[Number(event.detail.value)]
      if (!option) {
        return
      }

      emit('update:modelValue', {
        ...props.modelValue,
        province: option.value,
        city: '',
        district: ''
      })
    }

    const handleCityChange = (event) => {
      const option = cityOptions.value[Number(event.detail.value)]
      if (!option) {
        return
      }

      emit('update:modelValue', {
        ...props.modelValue,
        city: option.value,
        district: ''
      })
    }

    const handleDistrictChange = (event) => {
      const option = districtOptions.value[Number(event.detail.value)]
      if (!option) {
        return
      }

      emit('update:modelValue', {
        ...props.modelValue,
        district: option.value
      })
    }

    return {
      cityIndex,
      provinceOptions,
      provinceIndex,
      cityOptions,
      districtIndex,
      districtOptions,
      handleProvinceChange,
      handleCityChange,
      handleDistrictChange,
      selectedCityLabel,
      selectedDistrictLabel,
      selectedProvinceLabel
    }
  }
}
</script>

<style scoped>
.location-cascader {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #333;
}

.picker-field {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
  border-radius: 24rpx;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  font-size: 28rpx;
  box-sizing: border-box;
}

.picker-field::after {
  content: '›';
  color: rgba(15, 23, 42, 0.4);
  font-size: 34rpx;
  line-height: 1;
}

.picker-field--empty {
  color: rgba(15, 23, 42, 0.38);
}
</style>