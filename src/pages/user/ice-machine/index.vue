<template>
  <view class="ice-machine-page">
  </view>
</template>

<script>
import './index.scss'

export default {
  setup() {
    return {}
  },

  onShareAppMessage () {
    return {
      title: '柑之怡商户端',
      path: '/pages/home/index'
    }
  }
}
</script>
