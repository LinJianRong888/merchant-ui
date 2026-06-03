<template>
  <view class="invite-entry-page">
    <view class="invite-entry-card">
      <text class="invite-entry-badge">SCAN ENTRY</text>
      <text class="invite-entry-title">扫码入口调试页</text>
      <text class="invite-entry-desc">
        已输出 App 与页面两侧的扫码日志。你可以在控制台核对进入场景、参数来源和解析后的 invite_code。
      </text>

      <view class="invite-entry-panel">
        <view class="invite-entry-row">
          <text class="invite-entry-label">场景来源</text>
          <text class="invite-entry-value">{{ scanSummary }}</text>
        </view>

        <view class="invite-entry-row">
          <text class="invite-entry-label">invite_code</text>
          <text class="invite-entry-value" :class="{ 'invite-entry-value--muted': !inviteCode }">
            {{ inviteCode || '未解析到' }}
          </text>
        </view>

        <view class="invite-entry-row">
          <text class="invite-entry-label">参数来源</text>
          <text class="invite-entry-value">{{ inviteCodeSource }}</text>
        </view>

        <view class="invite-entry-row">
          <text class="invite-entry-label">scene 原始参数</text>
          <text class="invite-entry-value" :class="{ 'invite-entry-value--muted': !scenePayloadRaw }">
            {{ scenePayloadRaw || '无' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { computed, ref } from 'vue'
import Taro, { getCurrentInstance, useDidShow, useLoad } from '@tarojs/taro'

import { getCurrentEnterOptions, getScanEntryDebugInfo } from '@/utils/scan-entry'

import './index.scss'

function logInviteEntry(stage, pageQuery) {
  const enterOptions = getCurrentEnterOptions(Taro) || {}
  const info = getScanEntryDebugInfo({
    ...enterOptions,
    query: {
      ...(enterOptions.query || {}),
      ...(pageQuery || {})
    }
  })

  console.log(`[scan-entry][${stage}]`, {
    pageQuery,
    enterOptions,
    normalized: info
  })

  return info
}

export default {
  setup () {
    const inviteCode = ref('')
    const inviteCodeSource = ref('not-found')
    const scenePayloadRaw = ref('')
    const sceneLabel = ref('未知入口')
    const sceneCategory = ref('other')

    function applyDebugInfo(info) {
      inviteCode.value = info.inviteCode || ''
      inviteCodeSource.value = info.inviteCodeSource || 'not-found'
      scenePayloadRaw.value = info.scenePayloadRaw || ''
      sceneLabel.value = info.sceneLabel || '未知入口'
      sceneCategory.value = info.sceneCategory || 'other'

      console.log('[scan-entry][invite-code]', {
        inviteCode: inviteCode.value,
        inviteCodeSource: inviteCodeSource.value
      })
    }

    useLoad((params) => {
      applyDebugInfo(logInviteEntry('page:useLoad', params || {}))
    })

    useDidShow(() => {
      const currentParams = getCurrentInstance()?.router?.params || {}

      applyDebugInfo(logInviteEntry('page:useDidShow', currentParams))
    })

    const scanSummary = computed(() => `${sceneLabel.value} / ${sceneCategory.value}`)

    return {
      inviteCode,
      inviteCodeSource,
      scanSummary,
      scenePayloadRaw
    }
  }
}
</script>