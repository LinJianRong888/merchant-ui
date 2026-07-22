<template>
  <view class="user-page">
    <view class="user-header">
      <view class="user-card">
        <button
          v-if="isLoggedIn"
          class="avatar-btn"
          open-type="chooseAvatar"
          @chooseavatar="onChooseAvatar"
        >
          <image
            class="avatar-image"
            :src="displayAvatar || ''"
            mode="aspectFill"
          />
          <text v-if="!displayAvatar" class="avatar-placeholder-text"></text>
        </button>
        <view v-else class="user-avatar" @tap="goToLogin">
          <view class="user-avatar-circle"></view>
        </view>

        <view class="user-detail">
          <!-- 问候行 -->
          <view class="greeting-row">
            <text class="greeting-icon">&#9728;</text>
            <text class="greeting-text">{{ greetingText }}</text>
          </view>

          <!-- 姓名行 -->
          <template v-if="isLoggedIn">
            <view class="name-row">
              <text v-if="!isEditingNickname" class="user-name">{{ displayName || '用户' }}</text>
              <input
                v-else
                class="user-name-input"
                type="text"
                :value="editName"
                :placeholder="displayName || '用户'"
                :focus="isEditingNickname"
                @input="onEditNameInput"
                @confirm="onNicknameChange"
                @blur="onNicknameBlur"
              />
              <view
                class="name-edit-btn"
                @tap="startEditNickname"
                v-if="!isEditingNickname"
              >
                <text class="name-edit-icon">&#9998;</text>
              </view>
              <view class="role-tag">
                <text class="role-tag-text">会员</text>
              </view>
            </view>
          </template>

          <!-- 手机号行 -->
          <template v-if="isLoggedIn">
            <view class="phone-row">
              <text class="phone-icon">&#9743;</text>
              <text class="user-phone" v-if="profilePhone">{{ maskPhone(profilePhone) }}</text>
              <text class="user-phone" v-else>未绑定</text>
            </view>
          </template>
          <text v-else class="login-hint" @tap="goToLogin">点击登录</text>
        </view>
      </view>

      <!-- 底部地址栏 -->
      <view class="address-bar">
        <view class="address-left">
          <text class="address-icon">&#9678;</text>
          <text class="address-text">{{ defaultAddress }}</text>
        </view>
      </view>
    </view>

    <view class="order-section">
      <view class="order-header">
        <text class="order-title">我的订单</text>
        <view class="order-more" @tap="goToOrders('all')">
          <text class="order-more-text">全部订单</text>
          <text class="order-more-arrow">›</text>
        </view>
      </view>
      <view class="order-items">
        <view class="order-item" @tap="goToOrders('pending')">
          <view class="order-icon-wrap">
            <image class="order-icon-img" src="@/assets/order-pending.png" mode="aspectFit" />
            <view v-if="pendingCount > 0" class="order-badge">
              <text class="order-badge-text">{{ pendingCount }}</text>
            </view>
          </view>
          <text class="order-label">待处理</text>
        </view>
        <view class="order-item" @tap="goToOrders('paid')">
          <view class="order-icon-wrap">
            <image class="order-icon-img" src="@/assets/order-shipped.png" mode="aspectFit" />
            <view v-if="shippedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ shippedCount }}</text>
            </view>
          </view>
          <text class="order-label">待发货</text>
        </view>
        <view class="order-item" @tap="goToOrders('shipped')">
          <view class="order-icon-wrap">
            <image class="order-icon-img" src="@/assets/order-received.png" mode="aspectFit" />
            <view v-if="receivedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ receivedCount }}</text>
            </view>
          </view>
          <text class="order-label">待收货</text>
        </view>
        <view class="order-item" @tap="goToOrders('completed')">
          <view class="order-icon-wrap">
            <image class="order-icon-img" src="@/assets/order-completed.png" mode="aspectFit" />
            <view v-if="reviewedCount > 0" class="order-badge">
              <text class="order-badge-text">{{ reviewedCount }}</text>
            </view>
          </view>
          <text class="order-label">已完成</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @tap="goToIceMachine">
        <view class="menu-left">
          <image class="menu-icon-img" src="@/assets/ice-machine.png" mode="aspectFit" />
          <text class="menu-text">制冰机</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goToAddresses">
        <view class="menu-left">
          <image class="menu-icon-img" src="@/assets/address.png" mode="aspectFit" />
          <text class="menu-text">收货地址</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goToCustomerService">
        <view class="menu-left">
          <view class="menu-icon kefu-icon"></view>
          <text class="menu-text">联系客服</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view v-if="isLoggedIn" class="menu-item" :class="{ 'menu-item--disabled': inviteBound || canDoBusiness }" @tap="inviteBound || canDoBusiness ? null : showInviteModal = true">
        <view class="menu-left">
          <view class="menu-icon invite-icon" :class="{ 'invite-icon--done': inviteBound || canDoBusiness }"></view>
          <text class="menu-text" :class="{ 'menu-text--muted': inviteBound || canDoBusiness }">{{ inviteBound || canDoBusiness ? '已绑定邀请码' : '填写邀请码' }}</text>
        </view>
        <text class="menu-arrow" :class="{ 'menu-arrow--muted': inviteBound || canDoBusiness }">›</text>
      </view>
      <view v-if="isLoggedIn" class="menu-item menu-item--sign" @tap="handleSignTap">
        <view class="menu-left">
          <view class="sign-status-dot" :class="signStatusClass"></view>
          <text class="menu-text" :class="{ 'menu-text--danger': !canDoBusiness && !hasSigned }">{{ signingLabel }}</text>
        </view>
        <text class="menu-arrow" :class="{ 'menu-arrow--danger': !canDoBusiness && !hasSigned }">›</text>
      </view>
      <view v-if="isLoggedIn" class="menu-item" @tap="handleLogout">
        <view class="menu-left">
          <image class="menu-icon-img" src="@/assets/logout.png" mode="aspectFit" />
          <text class="menu-text menu-text--danger">退出登录</text>
        </view>
        <text class="menu-arrow menu-arrow--danger">›</text>
      </view>
    </view>

    <!-- 填写邀请码弹窗 -->
    <view v-if="showInviteModal" class="invite-modal-mask" @tap="showInviteModal = false">
      <view class="invite-modal-card" @tap.stop>
        <text class="invite-modal-title">填写邀请码</text>
        <input
          class="invite-modal-input"
          :value="inviteCodeInput"
          placeholder="请输入邀请码"
          placeholder-style="color:#c0c6cc;"
          maxlength="30"
          @input="onInviteCodeInput"
        />
        <view class="invite-modal-btns">
          <button class="invite-modal-btn cancel" @tap="showInviteModal = false">取消</button>
          <button class="invite-modal-btn confirm" :disabled="inviteSubmitting" @tap="handleBindInviteCode">
            {{ inviteSubmitting ? '提交中...' : '确认' }}
          </button>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import Taro, { useDidShow } from '@tarojs/taro'
import { ref, computed, watch } from 'vue'
import { useAppQuery } from '@/utils/app-query'
import { useAuthStore } from '@/stores/auth'
import { getCurrentUser, updateCurrentUser, uploadAvatar } from '@/api/users'
import { listOrders } from '@/api/orders'
import { listUserAddresses } from '@/api/user-addresses'
import { getSigningStatus } from '@/api/esign'
import { bindInviteCode } from '@/api/invitation'
import './index.scss'

const ADDRESSES_PAGE = '/pages/user/addresses/index'
const ORDERS_PAGE = '/pages/orders/index'
const LOGIN_PAGE = '/pages/index/index'
const ICE_MACHINE_PAGE = '/pages/user/ice-machine/index'
const CUSTOMER_SERVICE_PAGE = '/pages/user/customer-service/index'

const STORAGE_AVATAR_KEY = 'user_avatar_url'

export default {
  setup() {
    const authStore = useAuthStore()
    const isLoggedIn = computed(() => authStore.isAuthenticated)

    // ---- 头像（优先后端 profile.avatar，其次本地缓存） ----
    const avatarUrl = ref(Taro.getStorageSync(STORAGE_AVATAR_KEY) || '')

    async function onChooseAvatar (e) {
      const url = e.detail?.avatarUrl
      if (!url) return

      try {
        Taro.showLoading({ title: '上传中...' })
        const result = await uploadAvatar(url)
        const remoteUrl = result?.avatar_url || result?.avatar || ''
        if (remoteUrl) {
          avatarUrl.value = remoteUrl
          Taro.setStorageSync(STORAGE_AVATAR_KEY, remoteUrl)
        }
        await refetchUser()
        Taro.showToast({ title: '头像已更新', icon: 'success' })
      } catch (err) {
        console.error('[user] upload avatar error:', err)
        // 上传失败降级：使用本地临时路径
        avatarUrl.value = url
        Taro.setStorageSync(STORAGE_AVATAR_KEY, url)
        Taro.showToast({ title: '头像保存到本地', icon: 'none' })
      } finally {
        Taro.hideLoading()
      }
    }

    // ---- 昵称（本地存储） ----
    const STORAGE_NICKNAME_KEY = 'user_nickname'
    const localNickname = ref(Taro.getStorageSync(STORAGE_NICKNAME_KEY) || '')
    const isEditingNickname = ref(false)
    const editName = ref('')

    function startEditNickname () {
      editName.value = ''
      isEditingNickname.value = true
    }

    function onEditNameInput (e) {
      editName.value = e.detail?.value || ''
    }

    function onNicknameBlur (e) {
      // 延迟判断：如果 confirm 已经处理了，这里不再重复
      const name = (e?.detail?.value || editName.value || '').trim()
      if (!name) {
        isEditingNickname.value = false
        editName.value = ''
      }
      // 如果有值但还没提交（用户点了其他地方），走 confirm 逻辑
      if (name) {
        onNicknameChange(e)
      }
    }

    async function onNicknameChange (e) {
      const name = (e?.detail?.value || editName.value).trim()
      if (!name) {
        // 未输入：取消编辑，恢复原名
        isEditingNickname.value = false
        editName.value = ''
        return
      }

      isEditingNickname.value = false
      editName.value = ''

      try {
        Taro.showLoading({ title: '保存中...' })
        const result = await updateCurrentUser({ name })
        console.log('[user] update name result:', result)
        // 同步本地缓存 + 刷新后端数据
        localNickname.value = name
        Taro.setStorageSync(STORAGE_NICKNAME_KEY, name)
        await refetchUser()
        Taro.showToast({ title: '名称已更新', icon: 'success' })
      } catch (e) {
        console.error('[user] update name error:', e)
        const msg = e?.message || e?.detail || '更新失败，请重试'
        Taro.showToast({ title: msg, icon: 'none', duration: 3000 })
      } finally {
        Taro.hideLoading()
      }
    }

    // ---- 手机号（从后端 GET /api/v1/users/me/ 读取） ----
    const {
      data: userInfo,
      refetch: refetchUser
    } = useAppQuery({
      queryKey: ['user-info', 'me'],
      queryFn: getCurrentUser,
      enabled: computed(() => authStore.isAuthenticated),
      retry: 0
    })

    // 后端数据加载后优先使用后端头像
    const displayAvatar = computed(() => {
      return userInfo.value?.profile?.avatar || avatarUrl.value
    })

    const profilePhone = computed(() => {
      const storePhone = authStore.purePhoneNumber || authStore.phoneNumber || ''
      const apiPhone = userInfo.value?.profile?.phone || ''
      return storePhone || apiPhone
    })

    function maskPhone(phone) {
      if (!phone || phone.length < 11) return phone
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }

    // ---- 订单 ----
    const {
      data: orders
    } = useAppQuery({
      queryKey: ['orders', 'user-center'],
      queryFn: async () => {
        const response = await listOrders()
        const list = Array.isArray(response) ? response : []
        console.log('[user-center] orders raw:', JSON.stringify(list.map(o => ({ id: o.id, status: o.status, shipment_status: o.shipment_status, status_label: o.status_label })), null, 2))
        return list
      },
      enabled: computed(() => authStore.isAuthenticated)
    })

    function isOrderCompleted(item) {
      return item?.status === 'completed'
    }

    const pendingCount = computed(() => (orders.value || []).filter(item => item.status === 'pending').length)
    const shippedCount = computed(() => (orders.value || []).filter(item => item.status === 'paid' && item.shipment_status !== 'shipped').length)
    const receivedCount = computed(() => (orders.value || []).filter(item => {
      return item.shipment_status === 'shipped' && !isOrderCompleted(item)
    }).length)
    const reviewedCount = computed(() => {
      const completed = (orders.value || []).filter(item => isOrderCompleted(item))
      console.log('[user-center] reviewedCount completed orders:', completed.map(o => ({ id: o.id, status: o.status, shipment_status: o.shipment_status })))
      return completed.length
    })

    // 问候语
    const greetingText = computed(() => {
      const hour = new Date().getHours()
      if (hour < 12) return '上午好'
      if (hour < 18) return '下午好'
      return '晚上好'
    })

    // 显示名称（后端 profile.name → 本地缓存 → 后端 username → 默认）
    const displayName = computed(() => {
      return userInfo.value?.profile?.name
        || localNickname.value
        || userInfo.value?.username
        || '用户'
    })

    // ---- 签约 ----
    // can_do_business 统一从 authStore 读取（默认 false，启动时与后端核对）
    const canDoBusiness = computed(() => authStore.canDoBusiness)

    const userType = computed(() => userInfo.value?.user_type || 'customer')

    // 签约详情（agent 和 customer 分别走对应接口）
    const {
      data: signingInfo,
      refetch: refetchSigningStatus
    } = useAppQuery({
      queryKey: ['esign', 'signing', 'status', userType],
      queryFn: () => getSigningStatus(userType.value || 'customer'),
      enabled: computed(() => authStore.isAuthenticated)
    })

    // signingInfo 加载后同步到 authStore（不持久化，始终以后端为准）
    watch(signingInfo, (info) => {
      if (info && typeof info.can_do_business === 'boolean') {
        authStore.canDoBusiness = info.can_do_business
        authStore.esignCooperationSigned = !!info.esign_cooperation_signed
      }
    }, { immediate: true })

    // 是否已签署完成（不论 can_do_business，但不包含 needs_resign 的情况）
    const hasSigned = computed(() => {
      const info = signingInfo.value
      if (info?.needs_resign) return false
      return !!(info?.esign_cooperation_signed || info?.status === 'completed')
    })

    const signStatusClass = computed(() => {
      if (signingInfo.value?.needs_resign) return 'dot--red'
      if (canDoBusiness.value || hasSigned.value) return 'dot--green'
      if (signingInfo.value?.status === 'pending' || signingInfo.value?.status === 'partially_signed') return 'dot--yellow'
      return 'dot--gray'
    })

    const signingLabel = computed(() => {
      if (signingInfo.value?.needs_resign) return '需重新签署协议'
      if (canDoBusiness.value || hasSigned.value) return '合作协议已签署'
      if (signingInfo.value?.status === 'pending' || signingInfo.value?.status === 'partially_signed') return '签署进行中'
      return '签署合作协议'
    })

    async function handleSignTap () {
      // 已签署：提示无需操作
      if (canDoBusiness.value || hasSigned.value) {
        Taro.showToast({ title: '已完成签署', icon: 'none' })
        return
      }
      // 跳转到签署表单页，收集姓名和手机号
      const type = userType.value || 'customer'
      Taro.navigateTo({ url: `/pages/user/signing-form/index?userType=${type}` })
    }

    // 地址：优先后端 profile.address，其次取收货地址
    const defaultAddress = ref('')

    function updateDisplayAddress () {
      const profileAddr = userInfo.value?.profile?.address
      if (profileAddr) {
        defaultAddress.value = profileAddr
        return
      }
      void fetchDefaultAddress()
    }

    async function fetchDefaultAddress () {
      try {
        const list = await listUserAddresses()
        if (Array.isArray(list) && list.length > 0) {
          const addr = list.find(a => a.is_default) || list[0]
          defaultAddress.value = [addr.province, addr.city, addr.district]
            .filter(Boolean)
            .join('')
        }
      } catch {
        // 静默失败，保持占位文字
      }
    }

    // ---- 生命周期 ----
    useDidShow(() => {
      authStore.hydrate()
      // 启动时与后端核对 can_do_business
      authStore.syncCanDoBusiness()
      // 刷新本地头像
      avatarUrl.value = Taro.getStorageSync(STORAGE_AVATAR_KEY) || ''
      // 如果已登录，刷新后端用户信息和签署状态
      if (authStore.isAuthenticated) {
        refetchUser()
        updateDisplayAddress()
        void refetchSigningStatus()
      }
    })

    // ---- 邀请码 ----
    const INVITE_BOUND_KEY = 'invite_bound'
    const showInviteModal = ref(false)
    const inviteCodeInput = ref('')
    const inviteSubmitting = ref(false)
    // 从 localStorage 恢复绑定状态（canDoBusiness 由后端同步，inviteBound 由前端记录）
    const inviteBound = ref(Taro.getStorageSync(INVITE_BOUND_KEY) || false)

    function onInviteCodeInput (e) {
      inviteCodeInput.value = e.detail?.value || ''
    }

    function friendInviteError (raw) {
      if (!raw) return '绑定失败，请重试'
      if (raw.includes('does not match')) return '你填写的邀请码不存在或已失效，请检查后重新输入。'
      return raw
    }

    async function handleBindInviteCode () {
      const code = inviteCodeInput.value.trim()
      if (!code) {
        Taro.showToast({ title: '请输入邀请码', icon: 'none' })
        return
      }
      if (/[^a-zA-Z0-9]/.test(code)) {
        Taro.showToast({ title: '邀请码仅支持英文和数字', icon: 'none' })
        return
      }

      inviteSubmitting.value = true
      try {
        const res = await bindInviteCode(code)
        console.log('[user] bindInviteCode response:', res)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          Taro.showToast({ title: '邀请码绑定成功', icon: 'success' })
          showInviteModal.value = false
          inviteCodeInput.value = ''
          inviteBound.value = true
          Taro.setStorageSync(INVITE_BOUND_KEY, true)
          // 刷新签署状态（邀请码可能影响 can_do_business）
          authStore.syncCanDoBusiness()
          void refetchSigningStatus()
        } else {
          const msg = friendInviteError(res.data?.detail)
          Taro.showToast({ title: msg, icon: 'none' })
        }
      } catch (err) {
        console.error('[user] bindInviteCode error:', err)
        const msg = friendInviteError(err?.message || err?.data?.detail)
        Taro.showToast({ title: msg, icon: 'none' })
      } finally {
        inviteSubmitting.value = false
      }
    }

    // ---- 导航 ----
    function goToLogin() {
      Taro.navigateTo({ url: LOGIN_PAGE })
    }

    function goToAddresses() {
      Taro.navigateTo({ url: ADDRESSES_PAGE })
    }

    function goToOrders(tab) {
      Taro.navigateTo({ url: `${ORDERS_PAGE}?tab=${tab || 'all'}` })
    }

    function handleLogout() {
      Taro.showModal({
        title: '退出登录',
        content: '确认退出当前账号吗？',
        success: (result) => {
          if (!result.confirm) return
          authStore.clearSession()
          void Taro.reLaunch({ url: LOGIN_PAGE })
        }
      })
    }

    function goToIceMachine() {
      Taro.navigateTo({ url: ICE_MACHINE_PAGE })
    }

    function goToCustomerService() {
      Taro.navigateTo({ url: CUSTOMER_SERVICE_PAGE })
    }

    return {
      isLoggedIn,
      avatarUrl,
      displayAvatar,
      onChooseAvatar,
      onEditNameInput,
      onNicknameBlur,
      onNicknameChange,
      isEditingNickname,
      startEditNickname,
      editName,
      profilePhone,
      maskPhone,
      pendingCount,
      shippedCount,
      receivedCount,
      reviewedCount,
      greetingText,
      displayName,
      canDoBusiness,
      hasSigned,
      signStatusClass,
      signingLabel,
      handleSignTap,
      defaultAddress,
      goToLogin,
      goToAddresses,
      goToOrders,
      goToIceMachine,
      goToCustomerService,
      handleLogout,
      showInviteModal,
      inviteBound,
      inviteCodeInput,
      inviteSubmitting,
      onInviteCodeInput,
      handleBindInviteCode
    }
  }
}
</script>
