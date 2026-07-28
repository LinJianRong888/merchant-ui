const SCAN_SCENE_MAP = Object.freeze({
  1011: {
    key: 'qr-scan',
    label: '扫描二维码',
    category: 'qr-code'
  },
  1012: {
    key: 'qr-image-recognition',
    label: '长按图片识别二维码',
    category: 'qr-code'
  },
  1013: {
    key: 'qr-album-scan',
    label: '从手机相册选取二维码',
    category: 'qr-code'
  },
  1025: {
    key: 'barcode-scan',
    label: '扫描一维码',
    category: 'barcode'
  },
  1031: {
    key: 'barcode-image-recognition',
    label: '长按图片识别一维码',
    category: 'barcode'
  },
  1032: {
    key: 'barcode-album-scan',
    label: '从手机相册选取一维码',
    category: 'barcode'
  },
  1047: {
    key: 'mini-program-code-scan',
    label: '扫描小程序码',
    category: 'mini-program-code'
  },
  1048: {
    key: 'mini-program-code-image-recognition',
    label: '长按图片识别小程序码',
    category: 'mini-program-code'
  },
  1049: {
    key: 'mini-program-code-album-scan',
    label: '从手机相册选取小程序码',
    category: 'mini-program-code'
  }
})

function normalizeObject(input) {
  if (!input || typeof input !== 'object') {
    return {}
  }

  return Object.keys(input).reduce((result, key) => {
    result[key] = input[key]
    return result
  }, {})
}

/**
 * 判断字符串是否包含 URL 编码字符（% 后跟两位十六进制）
 */
function needsDecoding(value) {
  if (typeof value !== 'string' || !value) {
    return false
  }
  return /%[0-9A-Fa-f]{2}/.test(value)
}

function safeDecode(value) {
  if (typeof value !== 'string' || !value) {
    return ''
  }

  // 只解码包含编码字符的字符串，防止双重解码
  if (!needsDecoding(value)) {
    return value
  }

  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'))
  } catch {
    return value
  }
}

function parseScenePayload(rawScene) {
  const decoded = safeDecode(rawScene)

  if (!decoded) {
    return {
      raw: typeof rawScene === 'string' ? rawScene : '',
      decoded: '',
      params: {}
    }
  }

  const params = decoded.split('&').reduce((result, part) => {
    if (!part) {
      return result
    }

    const separatorIndex = part.indexOf('=')

    if (separatorIndex === -1) {
      result[part] = ''
      return result
    }

    const rawKey = part.slice(0, separatorIndex)
    const rawValue = part.slice(separatorIndex + 1)
    const key = safeDecode(rawKey)

    result[key] = safeDecode(rawValue)
    return result
  }, {})

  return {
    raw: typeof rawScene === 'string' ? rawScene : '',
    decoded,
    params
  }
}

function getSceneMeta(sceneValue) {
  const normalizedValue = Number(sceneValue)
  const sceneMeta = SCAN_SCENE_MAP[normalizedValue]

  if (!sceneMeta) {
    return {
      value: Number.isFinite(normalizedValue) ? normalizedValue : null,
      matched: false,
      key: 'non-scan-entry',
      label: '非扫码入口',
      category: 'other'
    }
  }

  return {
    value: normalizedValue,
    matched: true,
    ...sceneMeta
  }
}

export function getCurrentEnterOptions(Taro) {
  // 优先使用 getEnterOptionsSync（获取当前进入参数，适用于热启动）
  if (Taro && typeof Taro.getEnterOptionsSync === 'function') {
    try {
      return Taro.getEnterOptionsSync()
    } catch {
      // fall through
    }
  }

  // 降级到 getLaunchOptionsSync（冷启动参数）
  if (Taro && typeof Taro.getLaunchOptionsSync === 'function') {
    try {
      return Taro.getLaunchOptionsSync()
    } catch {
      // fall through
    }
  }

  return null
}

/**
 * 从多种来源提取邀请码，按优先级排列：
 * 1. query.invite_code        — 路径直传参数
 * 2. query.scene 解码后的 invite_code  — 小程序码 scene 参数（编码在 query 中）
 * 3. options.scene 解码后的 invite_code — 部分平台将 scene 放在顶层
 */
function extractInviteCode(options) {
  const normalizedOptions = normalizeObject(options)
  const query = normalizeObject(normalizedOptions.query)

  // 来源 1：直接的 query 参数
  if (query.invite_code) {
    console.log('[scan-entry] invite_code found in query.invite_code:', query.invite_code)
    return {
      inviteCode: String(query.invite_code),
      source: 'query.invite_code'
    }
  }

  // 来源 2：query.scene 中的编码参数
  if (query.scene) {
    const payload = parseScenePayload(query.scene)
    if (payload.params.invite_code) {
      console.log('[scan-entry] invite_code found in query.scene (decoded):', payload.params.invite_code)
      return {
        inviteCode: String(payload.params.invite_code),
        source: 'query.scene',
        scenePayload: payload
      }
    }
    // query.scene 本身可能就是 invite_code（键值对不带 = 号的情况）
    console.log('[scan-entry] query.scene present but no invite_code in decoded params, raw:', query.scene)
  }

  // 来源 3：options.scene（部分平台的场景值在顶层）
  const rawScene = normalizedOptions.scene
  if (rawScene && typeof rawScene === 'string') {
    const payload = parseScenePayload(rawScene)
    if (payload.params.invite_code) {
      console.log('[scan-entry] invite_code found in options.scene (decoded):', payload.params.invite_code)
      return {
        inviteCode: String(payload.params.invite_code),
        source: 'options.scene',
        scenePayload: payload
      }
    }
    console.log('[scan-entry] options.scene present but no invite_code, raw:', rawScene)
  }

  console.log('[scan-entry] invite_code not found in any source')
  return {
    inviteCode: '',
    source: 'not-found'
  }
}

export function getScanEntryDebugInfo(options = {}) {
  const normalizedOptions = normalizeObject(options)
  const query = normalizeObject(normalizedOptions.query)
  const sceneMeta = getSceneMeta(normalizedOptions.scene)

  const extracted = extractInviteCode(options)
  const scenePayload = extracted.scenePayload || parseScenePayload(query.scene || normalizedOptions.scene || '')

  console.log('[scan-entry] debug info', {
    path: normalizedOptions.path || '',
    scene: sceneMeta,
    queryKeys: Object.keys(query),
    inviteCode: extracted.inviteCode ? `${extracted.inviteCode.slice(0, 4)}...` : '(empty)',
    source: extracted.source
  })

  return {
    path: normalizedOptions.path || '',
    scene: sceneMeta.value,
    sceneKey: sceneMeta.key,
    sceneLabel: sceneMeta.label,
    sceneCategory: sceneMeta.category,
    isScanEntry: sceneMeta.matched,
    query,
    inviteCode: extracted.inviteCode,
    inviteCodeSource: extracted.source,
    scenePayloadRaw: scenePayload.raw,
    scenePayloadDecoded: scenePayload.decoded,
    scenePayloadParams: scenePayload.params,
    referrerInfo: normalizeObject(normalizedOptions.referrerInfo)
  }
}

export { SCAN_SCENE_MAP }
