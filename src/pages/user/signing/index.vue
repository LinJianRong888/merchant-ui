<template>
  <web-view :src="signUrl" @message="onMessage" />
</template>

<script>
import Taro from '@tarojs/taro'
import { ref, onMounted } from 'vue'

export default {
  setup () {
    const signUrl = ref('')

    onMounted(() => {
      const instance = Taro.getCurrentInstance()
      const url = instance?.router?.params?.url || ''
      signUrl.value = decodeURIComponent(url)
    })

    function onMessage (e) {
      // e签宝 H5 页面可能通过 postMessage 回传状态
      const data = e.detail?.data || []
      if (data.some(d => d?.type === 'esign-complete')) {
        Taro.showToast({ title: '签署完成', icon: 'success' })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      }
    }

    return { signUrl, onMessage }
  }
}
</script>
