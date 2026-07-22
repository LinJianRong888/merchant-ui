<template>
  <view class="customer-service-page">
    <view class="kefu-card">
      <view class="kefu-card__icon"></view>
      <text class="kefu-card__title">联系客服</text>
      <text class="kefu-card__desc">如有任何问题，请点击下方按钮联系在线客服</text>
      <button class="kefu-btn" open-type="contact">
        <text class="kefu-btn__icon">&#9743;</text>
        <text>联系在线客服</text>
      </button>
    </view>
  </view>
</template>

<script>
export default {
  setup() {
    return {}
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
  padding: 80rpx 40rpx 40rpx;
  box-sizing: border-box;
}

.kefu-card {
  width: 100%;
  background: #fff;
  border-radius: 20rpx;
  padding: 64rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.kefu-card__icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  background: #eff6ff;
  margin-bottom: 24rpx;
  position: relative;
}

.kefu-card__icon::before {
  content: '';
  position: absolute;
  width: 36rpx;
  height: 28rpx;
  border: 4rpx solid #3b82f6;
  border-radius: 50%;
  top: 26rpx;
  left: 50%;
  transform: translateX(-50%);
}

.kefu-card__icon::after {
  content: '';
  position: absolute;
  width: 14rpx;
  height: 14rpx;
  border: 4rpx solid #3b82f6;
  border-radius: 0 0 50% 50%;
  border-top: none;
  bottom: 26rpx;
  left: 50%;
  transform: translateX(-50%);
}

.kefu-card__title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12rpx;
}

.kefu-card__desc {
  font-size: 26rpx;
  color: #6b7280;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 40rpx;
}

.kefu-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.kefu-btn::after {
  border: none;
}

.kefu-btn__icon {
  font-size: 32rpx;
}
</style>
