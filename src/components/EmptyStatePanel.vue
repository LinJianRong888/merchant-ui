<template>
  <view class="empty-state-panel">
    <view class="empty-state-panel__badge">{{ badgeText }}</view>
    <text class="empty-state-panel__title">{{ title }}</text>
    <text v-if="description" class="empty-state-panel__description">{{ description }}</text>
    <button v-if="actionText" class="empty-state-panel__action" @tap="handleAction">{{ actionText }}</button>
  </view>
</template>

<script>
export default {
  props: {
    badgeText: {
      type: String,
      default: 'EMPTY'
    },
    title: {
      type: String,
      default: '暂无内容'
    },
    description: {
      type: String,
      default: ''
    },
    actionText: {
      type: String,
      default: ''
    }
  },

  emits: ['action'],

  setup (_, { emit }) {
    function handleAction () {
      emit('action')
    }

    return {
      handleAction
    }
  }
}
</script>

<style lang="scss">
.empty-state-panel {
  min-height: 520rpx;
  margin: 48rpx 32rpx;
  padding: 56rpx 40rpx;
  border-radius: 32rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 153, 0.9), transparent 34%),
    linear-gradient(160deg, #fffaf1 0%, #f6efe0 100%);
  box-shadow: 0 24rpx 48rpx rgba(121, 88, 33, 0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.empty-state-panel__badge {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(142, 102, 34, 0.1);
  color: #8e6622;
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
}

.empty-state-panel__title {
  margin-top: 24rpx;
  color: #33230b;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.35;
}

.empty-state-panel__description {
  margin-top: 16rpx;
  color: #6f5b36;
  font-size: 26rpx;
  line-height: 1.7;
}

.empty-state-panel__action {
  margin: 32rpx 0 0;
  min-width: 220rpx;
  height: 84rpx;
  line-height: 84rpx;
  padding: 0 32rpx;
  border: none;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #2f2618 0%, #5f4a24 100%);
  color: #fff7e8;
  font-size: 28rpx;
  font-weight: 600;
}

.empty-state-panel__action::after {
  border: none;
}
</style>