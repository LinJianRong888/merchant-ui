
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Taro from '@tarojs/taro'

import { useAuthStore } from '@/stores/auth'
import { loginWithWechatMiniapp, MERCHANT_MINIAPP_SLUG } from '@/api/miniapp-auth'

import './app.scss'

async function performSilentLogin () {
  if (authStore.isAuthenticated) {
    console.log('[silent-login] 已登录，跳过')
    return
  }

  // 如果已有静默 token，跳过请求但仍通知页面可用
  const existingSilentToken = Taro.getStorageSync('silent_token')
  if (existingSilentToken) {
    console.log('[silent-login] 已有静默 token，跳过')
    authStore.notifySilentTokenReady()
    return
  }

  try {
    console.log('[silent-login] 开始获取静默 token...')
    const loginRes = await Taro.login()

    if (!loginRes.code) {
      console.warn('[silent-login] Taro.login 未返回 code')
      return
    }

    const response = await loginWithWechatMiniapp({
      code: loginRes.code,
      appSlug: MERCHANT_MINIAPP_SLUG
    })

    if (response.statusCode >= 200 && response.statusCode < 300) {
      const token = response.data?.access || ''
      if (token) {
        // 只存为静默 token，不写入 authStore，用户保持未登录状态
        Taro.setStorageSync('silent_token', token)
        authStore.notifySilentTokenReady()
        console.log('[silent-login] 静默 token 已存储')
      }
    } else {
      console.warn('[silent-login] 后端返回非成功状态', response.statusCode)
    }
  } catch (error) {
    console.warn('[silent-login] 静默 token 获取失败', error?.message || error)
  }
}

// 扫码进入的场景值
const SCAN_SCENES = [1011, 1012, 1013, 1047, 1048, 1049]

function isScanEntry (options) {
  // 优先用 options.scene
  if (options?.scene && SCAN_SCENES.includes(options.scene)) return true
  // 兜底：用 Taro API 获取小程序启动/进入参数
  try {
    const launch = Taro.getLaunchOptionsSync()
    if (launch?.scene && SCAN_SCENES.includes(launch.scene)) return true
    const enter = Taro.getEnterOptionsSync()
    if (enter?.scene && SCAN_SCENES.includes(enter.scene)) return true
  } catch (e) { /* ignore */ }
  return false
}

const App = createApp({
  onLaunch (options) {
    console.log('App launched.', { scene: options?.scene })

    // 版本更新检测
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()

      updateManager.onCheckForUpdate(res => {
        if (res.hasUpdate) console.log('发现线上新版本')
      })

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '版本更新',
          content: '已检测到新版本，立即重启体验新功能？',
          confirmText: '立即更新',
          cancelText: '稍后再说',
          success: res => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })

      updateManager.onUpdateFailed(() => {
        wx.showToast({ title: '更新失败，请检查网络', icon: 'none' })
      })
    }

    // 扫码进入时跳过静默登录，由 invite-entry 页面处理注册/登录
    if (isScanEntry(options)) {
      console.log('[silent-login] 扫码进入，跳过静默登录')
      return
    }

    void performSilentLogin()
  },
  onShow (options) {
    console.log('App onShow.', { scene: options?.scene })

    // 扫码进入时跳过静默登录
    if (isScanEntry(options)) {
      console.log('[silent-login] 扫码进入，跳过静默登录')
      return
    }

    void performSilentLogin()
  },
  // 入口组件不需要实现 render 方法，即使实现了也会被 taro 所覆盖
})

const pinia = createPinia()
App.use(pinia)

const authStore = useAuthStore()
authStore.hydrate()

export default App
