<template>
  <view class="esign-container">
    <!-- 加载中 -->
    <view v-if="pageState === 'loading'" class="esign-loading">
      <text class="esign-loading-text">正在检查签署状态...</text>
    </view>

    <!-- 已完成签署（真正完成） -->
    <view v-if="pageState === 'signed'" class="esign-result">
      <view class="esign-icon-text success"></view>
      <text class="esign-title">合作协议已签署完成</text>
      <text class="esign-desc">您可以返回继续使用业务功能</text>
      <button class="esign-btn" @tap="goBack">返回</button>
    </view>

    <!-- 客户已签署，等待平台方签署 -->
    <view v-if="pageState === 'partialSigned'" class="esign-result">
      <view class="esign-icon-text link"></view>
      <text class="esign-title">您已完成签署</text>
      <text class="esign-desc">等待平台方签署后，即可正常使用</text>
      <button class="esign-btn" @tap="goBack">返回</button>
    </view>

    <!-- 管理员要求重新签署 -->
    <view v-if="pageState === 'needsResign'" class="esign-result">
      <view class="esign-icon-text warning"></view>
      <text class="esign-title">管理员要求您重新签署合作协议</text>
      <text class="esign-desc">请重新填写信息并完成签署以恢复业务权限</text>
      <button class="esign-btn primary" @tap="handleResign">重新签署</button>
      <button class="esign-btn" @tap="goBack">返回</button>
    </view>

    <!-- 填写实名信息表单 -->
    <view v-if="pageState === 'form'" class="esign-form-wrap">
      <view class="form-header">
        <text class="form-title">实名信息确认</text>
        <text class="form-desc">为确保电子合同法律效力，请填写您的真实身份信息</text>
      </view>

      <view class="form-warning">
        <text class="warning-icon"></text>
        <text class="warning-text">签约后身份信息将不可修改，请仔细核对后再提交</text>
      </view>

      <view class="form-body">
        <view class="form-item">
          <text class="form-label">真实姓名</text>
          <input
            v-model="form.realName"
            class="form-input"
            placeholder="请输入真实姓名"
            placeholder-style="color:#c0c6cc;"
            maxlength="30"
          />
        </view>
        <view class="form-item">
          <text class="form-label">手机号码</text>
          <text
            v-if="form.phone"
            class="form-phone-value"
          >{{ form.phone }}</text>
          <button
            v-else
            class="form-phone-btn"
            open-type="getPhoneNumber"
            @getphonenumber="onGetPhoneNumber"
          >获取微信手机号</button>
        </view>
      </view>

      <view class="form-agreement">
        <text class="agreement-text">点击提交即表示您确认以上信息真实有效，并同意签署电子合作协议</text>
      </view>

      <button class="esign-btn primary form-submit-btn" :disabled="submitting" @tap="handleSubmit">
        {{ submitting ? '提交中...' : '确认并获取签署链接' }}
      </button>
      <button v-if="hasInProgress" class="esign-btn cancel form-cancel-btn" :disabled="cancelling" @tap="cancelAndRefill">
        {{ cancelling ? '取消中...' : '取消待签署任务' }}
      </button>
    </view>

    <!-- 已获取签署链接 -->
    <view v-if="pageState === 'signUrl'" class="esign-result">
      <view class="esign-icon-text link--url"></view>
      <text class="esign-title">签署链接已生成</text>
      <text class="esign-desc">请在外部浏览器中打开以下链接完成签署：</text>
      <view class="esign-url-box">
        <text class="esign-url">{{ signUrl }}</text>
      </view>
      <button class="esign-btn primary" @tap="copyLink">复制签署链接</button>
      <button class="esign-btn" @tap="checkStatus">我已完成签署</button>
      <button class="esign-btn cancel" :disabled="cancelling" @tap="cancelAndRefill">
        {{ cancelling ? '取消中...' : '取消并重新填写' }}
      </button>
    </view>

    <!-- 错误状态 -->
    <view v-if="pageState === 'error'" class="esign-result">
      <view class="esign-icon-text error"></view>
      <text class="esign-title">{{ errorMsg || '获取签署链接失败' }}</text>
      <button class="esign-btn" @tap="retry">重试</button>
      <button v-if="hasInProgress" class="esign-btn cancel" :disabled="cancelling" @tap="cancelAndRefill">
        {{ cancelling ? '取消中...' : '取消并重新填写' }}
      </button>
      <button class="esign-btn" @tap="goBack">返回</button>
    </view>
  </view>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import Taro from '@tarojs/taro'
import { startSigning, getSigningStatus, cancelSigning } from '@/api/esign'
import { fetchWechatPhoneNumber } from '@/api/miniapp-auth'
import { useAuthStore } from '@/stores/auth'

export default {
  setup () {
    const authStore = useAuthStore()

    const userType = ref('customer')
    const loading = ref(true)
    const signed = ref(false)
    const partialSigned = ref(false)
    const needsResign = ref(false)
    const showForm = ref(false)
    const signUrl = ref('')
    const errorMsg = ref('')
    const submitting = ref(false)
    const cancelling = ref(false)
    const hasInProgress = ref(false)

    const form = reactive({
      realName: '',
      phone: ''
    })

    const pageState = computed(() => {
      if (loading.value) return 'loading'
      if (signed.value) return 'signed'
      if (partialSigned.value) return 'partialSigned'
      if (needsResign.value) return 'needsResign'
      if (showForm.value) return 'form'
      if (signUrl.value) return 'signUrl'
      if (errorMsg.value) return 'error'
      return 'loading'
    })

    onMounted(() => {
      const instance = Taro.getCurrentInstance()
      userType.value = instance?.router?.params?.userType || 'customer'
      initSign()
    })

    async function initSign () {
      loading.value = true
      try {
        const statusData = await getSigningStatus(userType.value)
        console.log('[signing-form] status response:', statusData)

        // 真正合格：can_do_business 为 true
        if (statusData?.can_do_business) {
          authStore.canDoBusiness = true
          signed.value = true
          loading.value = false
          return
        }

        // 客户已签署，等待平台方签署（status_label === "部分已签"）
        if (statusData?.status_label === '部分已签') {
          Taro.showToast({ title: '您已完成签署，等待平台方签署', icon: 'none', duration: 2000 })
          setTimeout(() => {
            Taro.navigateBack()
          }, 2000)
          loading.value = false
          return
        }

        // 管理员重置：签过但需要重新签署
        if (statusData?.needs_resign) {
          needsResign.value = true
          loading.value = false
          return
        }

        // 签署已完成（不论 can_do_business），直接展示已完成页
        if (statusData?.esign_cooperation_signed || statusData?.status === 'completed') {
          signed.value = true
          loading.value = false
          return
        }

        // 有进行中的签署流程，直接获取url
        if (statusData?.has_signed && statusData?.status !== 'rejected' && statusData?.status !== 'expired' && statusData?.status !== 'failed') {
          hasInProgress.value = true
          const startRes = await startSigning(userType.value)
          console.log('[signing-form] initSign startSigning response:', startRes)
          if (startRes?.sign_url) {
            if (startRes?.detail && (startRes.detail.includes('已完成') || startRes.detail.includes('无需重复'))) {
              authStore.canDoBusiness = true
              signed.value = true
              signUrl.value = ''
              hasInProgress.value = false
              return
            }
            signUrl.value = startRes.sign_url
            copyToClipboard(startRes.sign_url)
            loading.value = false
            return
          }
          // 获取url失败
          if (startRes?.detail && (startRes.detail.includes('已完成') || startRes.detail.includes('无需重复'))) {
            authStore.canDoBusiness = true
            signed.value = true
            hasInProgress.value = false
            loading.value = false
            return
          }
          // 显示错误页（含取消按钮）
          errorMsg.value = startRes?.detail || startRes?.message || '获取签署链接失败'
          if (errorMsg.value) {
            Taro.showToast({ title: errorMsg.value, icon: 'none' })
          }
          loading.value = false
          return
        }

        // 需要填写信息发起签署
        showForm.value = true
        loading.value = false
      } catch (e) {
        errorMsg.value = '网络异常，请稍后重试'
        loading.value = false
      }
    }

    function validateForm () {
      if (!form.realName.trim()) {
        Taro.showToast({ title: '请输入真实姓名', icon: 'none' })
        return false
      }
      const name = form.realName.trim()
      if (name.length < 2) {
        Taro.showToast({ title: '姓名至少2个字符', icon: 'none' })
        return false
      }

      if (!form.phone) {
        Taro.showToast({ title: '请获取手机号码', icon: 'none' })
        return false
      }

      return true
    }

    async function onGetPhoneNumber (e) {
      const detail = e.detail || {}
      if (detail.errMsg && !detail.errMsg.includes('ok')) {
        Taro.showToast({ title: '取消授权', icon: 'none' })
        return
      }
      const code = detail.code
      if (!code) {
        Taro.showToast({ title: '获取手机号失败', icon: 'none' })
        return
      }
      try {
        Taro.showLoading({ title: '获取中...' })
        const response = await fetchWechatPhoneNumber({ code, updateProfilePhone: true })
        const data = response.data || response
        const phone = data.pure_phone_number || data.phone_number || ''
        if (phone) {
          form.phone = phone
          authStore.setPhoneNumber({
            phone_number: data.phone_number || phone,
            pure_phone_number: data.pure_phone_number || phone,
            country_code: data.country_code || ''
          })
          Taro.showToast({ title: '手机号已获取', icon: 'success' })
        }
      } catch (err) {
        console.error('[signing-form] getPhoneNumber error:', err)
        Taro.showToast({ title: '获取手机号失败', icon: 'none' })
      } finally {
        Taro.hideLoading()
      }
    }

    async function handleSubmit () {
      if (!validateForm()) return

      // 二次确认
      const confirmRes = await Taro.showModal({
        title: '提交确认',
        content: '姓名：' + form.realName.trim() + '\n手机号：' + String(form.phone || '').trim() + '\n\n签约后身份信息不可修改，确认提交？',
        confirmText: '确认提交',
        cancelText: '再想想'
      })

      if (!confirmRes.confirm) return

      submitting.value = true
      Taro.showLoading({ title: '发起签署中...' })

      try {
        const fillKey = userType.value === 'agent' ? 'agent' : 'customer'
        const result = await startSigning(userType.value, {
          fill_values: {
            [fillKey + '_name']: form.realName.trim(),
            [fillKey + '_phone']: String(form.phone || '').trim()
          }
        })
        console.log('[signing-form] startSigning response:', result)

        if (result?.sign_url) {
          signUrl.value = result.sign_url
          showForm.value = false
          needsResign.value = false
          copyToClipboard(result.sign_url)
        } else if (result?.detail) {
          Taro.showToast({ title: result.detail, icon: 'none' })
          if (result.detail.includes('已完成') || result.detail.includes('无需重复')) {
            authStore.canDoBusiness = true
            signed.value = true
            signUrl.value = ''
            showForm.value = false
          }
        } else {
          errorMsg.value = '发起签署失败'
        }
      } catch (e) {
        console.error('[signing-form] startSigning error:', e)
        errorMsg.value = '网络异常，请稍后重试'
      } finally {
        submitting.value = false
        Taro.hideLoading()
      }
    }

    function copyToClipboard (url) {
      Taro.setClipboardData({
        data: url,
        success: () => {
          Taro.showToast({ title: '链接已复制，请在浏览器中打开', icon: 'success', duration: 2000 })
        }
      })
    }

    function copyLink () {
      if (signUrl.value) {
        copyToClipboard(signUrl.value)
      }
    }

    async function cancelAndRefill () {
      const confirmRes = await Taro.showModal({
        title: '取消签署',
        content: '确定要取消当前签署流程并重新填写信息吗？',
        confirmText: '确定取消',
        cancelText: '再想想'
      })

      if (!confirmRes.confirm) return

      cancelling.value = true
      Taro.showLoading({ title: '取消中...' })

      try {
        await cancelSigning(userType.value)
        console.log('[signing-form] cancelSigning done')

        // 重新查询状态确认取消成功
        const statusData = await getSigningStatus(userType.value)
        console.log('[signing-form] cancel后 status:', statusData)

        // 重置状态，回到表单
        signUrl.value = ''
        showForm.value = true
        hasInProgress.value = false
        form.realName = ''
        form.phone = ''
        Taro.showToast({ title: '已取消，请重新填写', icon: 'success' })
      } catch (e) {
        console.error('[signing-form] cancelSigning error:', e)
        Taro.showToast({ title: '取消失败，请重试', icon: 'none' })
      } finally {
        cancelling.value = false
        Taro.hideLoading()
      }
    }

    async function checkStatus () {
      Taro.showLoading({ title: '检查中...' })
      try {
        const data = await getSigningStatus(userType.value)
        console.log('[signing-form] checkStatus response:', data)

        if (data?.can_do_business) {
          authStore.canDoBusiness = true
          signed.value = true
          signUrl.value = ''
          needsResign.value = false
          Taro.showToast({ title: '签署完成', icon: 'success' })
        } else if (data?.status_label === '部分已签') {
          Taro.showToast({ title: '您已完成签署，等待平台方签署', icon: 'none', duration: 2000 })
          setTimeout(() => {
            Taro.navigateBack()
          }, 2000)
        } else if (data?.needs_resign) {
          needsResign.value = true
          signUrl.value = ''
          Taro.showToast({ title: '管理员要求重新签署', icon: 'none' })
        } else if (data?.status_label === '待签署') {
          Taro.showToast({ title: '请先完成签署', icon: 'none' })
        } else {
          Taro.showToast({ title: '尚未检测到签署完成', icon: 'none' })
        }
      } catch (e) {
        Taro.showToast({ title: '检查失败', icon: 'none' })
      } finally {
        Taro.hideLoading()
      }
    }

    function retry () {
      errorMsg.value = ''
      signUrl.value = ''
      showForm.value = false
      partialSigned.value = false
      needsResign.value = false
      hasInProgress.value = false
      initSign()
    }

    function handleResign () {
      needsResign.value = false
      showForm.value = true
    }

    function goBack () {
      Taro.navigateBack()
    }

    return {
      loading,
      pageState,
      signed,
      partialSigned,
      needsResign,
      showForm,
      signUrl,
      errorMsg,
      submitting,
      cancelling,
      hasInProgress,
      form,
      handleSubmit,
      onGetPhoneNumber,
      copyLink,
      checkStatus,
      cancelAndRefill,
      goBack,
      retry,
      handleResign
    }
  }
}
</script>

<style>
.esign-container {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 40px;
  box-sizing: border-box;
}

.esign-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.esign-loading-text {
  font-size: 28px;
  color: #94a3b8;
}

.esign-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  width: 100%;
}

.esign-icon-text {
  width: 120px;
  height: 120px;
  border-radius: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  position: relative;
}

/* ===== success ✓ ===== */
.esign-icon-text.success {
  background: #dcfce7;
}
.esign-icon-text.success::before,
.esign-icon-text.success::after {
  content: '';
  position: absolute;
  background: #16a34a;
  border-radius: 3px;
}
.esign-icon-text.success::before {
  width: 16px;
  height: 48px;
  transform: rotate(45deg);
  left: 54px;
  top: 22px;
}
.esign-icon-text.success::after {
  width: 28px;
  height: 16px;
  transform: rotate(-45deg);
  left: 36px;
  top: 48px;
}

/* ===== link ○ ===== */
.esign-icon-text.link {
  background: #dbeafe;
}
.esign-icon-text.link::before {
  content: '';
  position: absolute;
  width: 44px;
  height: 44px;
  border: 5px solid #2563eb;
  border-radius: 50%;
}

/* ===== link--url ○ ===== */
.esign-icon-text.link--url {
  background: #dbeafe;
}
.esign-icon-text.link--url::before {
  content: '';
  position: absolute;
  width: 44px;
  height: 44px;
  border: 5px solid #2563eb;
  border-radius: 50%;
}

/* ===== error ✕ ===== */
.esign-icon-text.error {
  background: #fee2e2;
}
.esign-icon-text.error::before,
.esign-icon-text.error::after {
  content: '';
  position: absolute;
  width: 44px;
  height: 6px;
  background: #dc2626;
  border-radius: 3px;
}
.esign-icon-text.error::before {
  transform: rotate(45deg);
}
.esign-icon-text.error::after {
  transform: rotate(-45deg);
}

/* ===== warning ! ===== */
.esign-icon-text.warning {
  background: #fef3c7;
}
.esign-icon-text.warning::before {
  content: '';
  position: absolute;
  top: 28px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 22px 40px 22px;
  border-color: transparent transparent #d97706 transparent;
}
.esign-icon-text.warning::after {
  content: '';
  position: absolute;
  top: 74px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: #d97706;
}

.esign-title {
  font-size: 36px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 16px;
}

.esign-desc {
  font-size: 28px;
  color: #6b7280;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 40px;
}

.esign-url-box {
  width: 100%;
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.esign-url {
  font-size: 24px;
  color: #3b82f6;
  word-break: break-all;
  line-height: 1.5;
}

.esign-btn {
  position: relative;
  width: 100%;
  height: 88px;
  line-height: 88px;
  text-align: center;
  background: #ffffff;
  color: #1f2937;
  font-size: 32px;
  border-radius: 44px;
  margin-bottom: 24px;
  border: none;
  padding: 0;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.esign-btn::after {
  border: none;
}

.esign-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.esign-btn.cancel {
  background: #ffffff;
  color: #ef4444;
}

.esign-btn.cancel::after {
  border: 2px solid #fecaca;
}

.esign-btn.cancel[disabled] {
  opacity: 0.5;
}

.form-cancel-btn {
  margin-top: 24px;
}

.esign-btn:last-child {
  margin-bottom: 0;
}

/* 表单样式 */
.esign-form-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.form-header {
  margin-bottom: 32px;
}

.form-title {
  display: block;
  font-size: 40px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 12px;
}

.form-desc {
  font-size: 26px;
  color: #6b7280;
  line-height: 1.5;
}

.form-warning {
  display: flex;
  align-items: flex-start;
  background: #fef3c7;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 36px;
  gap: 12px;
}

.warning-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  position: relative;
}
.warning-icon::before {
  content: '!';
  color: #d97706;
  font-size: 24px;
  font-weight: bold;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.warning-text {
  font-size: 26px;
  color: #92400e;
  line-height: 1.5;
}

.form-body {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.form-item {
  display: flex;
  align-items: center;
  padding: 28px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 30px;
  font-weight: 600;
  color: #1f2937;
  width: 160px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 30px;
  color: #1f2937;
  height: 48px;
  line-height: 48px;
}

.form-input--readonly {
  color: #1f2937;
}

.form-phone-value {
  flex: 1;
  font-size: 30px;
  color: #1f2937;
  line-height: 48px;
}

.form-phone-btn {
  height: 64px;
  line-height: 64px;
  font-size: 28px;
  color: #2563eb;
  background: #dbeafe;
  border: none;
  border-radius: 12px;
  padding: 0 24px;
  text-align: center;
}

.form-phone-btn::after {
  border: none;
}

.form-agreement {
  margin-bottom: 36px;
}

.agreement-text {
  font-size: 24px;
  color: #94a3b8;
  line-height: 1.6;
}

.form-submit-btn {
  margin-top: 0;
}

.form-submit-btn[disabled] {
  opacity: 0.6;
}
</style>
