
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { useAuthStore } from '@/stores/auth'

import './app.scss'

const App = createApp({
  onLaunch () {
    console.log('App launched.')
  },
  onShow (options) {
    console.log('App onShow.')
  },
  // 入口组件不需要实现 render 方法，即使实现了也会被 taro 所覆盖
})

const pinia = createPinia()
const authStore = useAuthStore(pinia)

authStore.hydrate()

App.use(pinia)

export default App
