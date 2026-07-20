<template>
  <view class="agreement-page">
    <view class="agreement-header">
      <view class="agreement-user">
        <view class="agreement-user__avatar">
          <image
            v-if="avatarUrl"
            :src="avatarUrl"
            class="agreement-user__avatar-img"
            mode="aspectFill"
          />
          <view v-else class="agreement-user__avatar-placeholder">
            <text class="agreement-user__avatar-text">👤</text>
          </view>
        </view>
        <text class="agreement-user__name">{{ displayName || '用户' }}</text>
      </view>
      <text class="agreement-header__title">用户服务协议</text>
      
      <text class="agreement-header__subtitle">柑之怡小程序</text>
    </view>

    <view class="agreement-body">
      <view class="agreement-card">
        <text class="agreement-card__text">欢迎使用柑之怡小程序。</text>
        <text class="agreement-card__text">本协议是您与柑之怡之间关于使用本小程序服务所订立的协议。请您仔细阅读本协议，您点击同意即视为您已阅读并同意接受本协议的约束。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">一、服务内容</text>
        <text class="agreement-card__text">柑之怡为您提供商品浏览、下单购买、订单查询、物流跟踪等电商服务。我们致力于为您提供优质的茶叶产品和贴心的购物体验。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">二、用户账号</text>
        <text class="agreement-card__text">您在使用本服务时通过微信授权登录，您应保证授权信息的真实性和完整性。您应妥善保管您的账号信息，因账号保管不善导致的损失由您自行承担。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">三、用户行为规范</text>
        <text class="agreement-card__text">您在使用本服务时应遵守中华人民共和国相关法律法规，不得利用本服务从事违法违规行为，包括但不限于：发布违法信息、侵犯他人权益、干扰平台正常运营等。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">四、订单与支付</text>
        <text class="agreement-card__text">您确认订单即表明您同意按照订单金额支付相应费用。订单提交后请及时完成支付，超时未支付的订单可能会被自动取消。我们支持微信支付等支付方式。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">五、物流与配送</text>
        <text class="agreement-card__text">我们会按照您提供的收货地址安排发货，配送时间取决于物流公司的服务时效。您可在订单详情中查看物流轨迹信息。如遇物流异常，请及时联系客服处理。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">六、退换货政策</text>
        <text class="agreement-card__text">如您收到的商品存在质量问题，可在签收后7日内联系客服申请退换货。退换货商品应保持原包装完整，不影响二次销售。具体退换货流程请咨询客服。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">七、隐私保护</text>
        <text class="agreement-card__text">我们高度重视您的隐私保护。我们收集的个人信息仅用于提供和改进服务，不会未经您的同意向第三方披露。详细隐私政策请查看相关说明。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">八、免责声明</text>
        <text class="agreement-card__text">因不可抗力、系统维护、网络故障或其他不可控因素导致的服务中断或数据丢失，我们不承担责任。但我们会在合理范围内尽力减少对您的影响。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">九、知识产权</text>
        <text class="agreement-card__text">柑之怡小程序中的所有内容，包括但不限于文字、图片、图标、设计等，均受知识产权法律保护。未经授权，不得复制、转载或用于商业用途。</text>
      </view>

      <view class="agreement-card">
        <text class="agreement-card__title">十、协议修改</text>
        <text class="agreement-card__text">我们有权根据业务发展和法律法规的变化适时修改本协议。修改后的协议一经发布即生效，继续使用本服务即视为您同意修改后的协议。</text>
      </view>

      <view class="agreement-card agreement-card--contact">
        <text class="agreement-card__title">联系我们</text>
        <text class="agreement-card__text">如您对本协议有任何疑问或建议，请通过以下方式联系我们：</text>
        <text class="agreement-card__text agreement-card__text--highlight">在线客服：柑之怡小程序 - 我的 - 联系客服</text>
      </view>
    </view>

    <view class="agreement-footer">
      <text class="agreement-footer__text">柑之怡 · 一杯好茶 一份心意</text>
    </view>
  </view>
</template>

<script>
import { computed } from 'vue'
import { useAppQuery } from '@/utils/app-query'
import { useAuthStore } from '@/stores/auth'
import { getCurrentUser } from '@/api/users'

export default {
  setup () {
    const authStore = useAuthStore()

    const { data: userInfo } = useAppQuery({
      queryKey: ['user-info', 'me'],
      queryFn: getCurrentUser,
      enabled: computed(() => authStore.isAuthenticated),
      retry: 0
    })

    const avatarUrl = computed(() => {
      return userInfo.value?.profile?.avatar || ''
    })

    const displayName = computed(() => {
      return userInfo.value?.profile?.name || ''
    })

    return {
      avatarUrl,
      displayName
    }
  }
}
</script>

<style lang="scss">
  @import './index.scss';
</style>
