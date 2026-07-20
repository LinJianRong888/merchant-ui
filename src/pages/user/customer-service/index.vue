<template>
  <view class="customer-service-page">
    <image class="kefu-image" :src="kefuSrc" mode="widthFix" show-menu-by-longpress @tap="previewImage" />
    <view class="kefu-tip" @tap="previewImage">点击图片可放大查看、长按保存或识别二维码</view>
  </view>
</template>

<script>
import Taro from '@tarojs/taro'
import { ref } from 'vue'

export default {
  setup() {
    const kefuSrc = ref('/assets/kefu-qr.png')

    function previewImage() {
      Taro.previewImage({
        urls: [kefuSrc.value],
        current: kefuSrc.value
      })
    }

    return { kefuSrc, previewImage }
  }
}
</script>

<style>
.customer-service-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

.kefu-image {
  width: 100%;
  display: block;
  line-height: 0;
}

.kefu-tip {
  margin-top: 24px;
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.5;
}
</style>
