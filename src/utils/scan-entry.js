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

function safeDecode(value) {
  if (typeof value !== 'string' || !value) {
    return ''
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
  if (Taro && typeof Taro.getEnterOptionsSync === 'function') {
    return Taro.getEnterOptionsSync()
  }

  if (Taro && typeof Taro.getLaunchOptionsSync === 'function') {
    return Taro.getLaunchOptionsSync()
  }

  return null
}

export function getScanEntryDebugInfo(options = {}) {
  const normalizedOptions = normalizeObject(options)
  const query = normalizeObject(normalizedOptions.query)
  const sceneMeta = getSceneMeta(normalizedOptions.scene)
  const scenePayload = parseScenePayload(query.scene)

  const inviteCode = query.invite_code || scenePayload.params.invite_code || ''
  const inviteCodeSource = query.invite_code
    ? 'query.invite_code'
    : scenePayload.params.invite_code
      ? 'query.scene'
      : 'not-found'

  return {
    path: normalizedOptions.path || '',
    scene: sceneMeta.value,
    sceneKey: sceneMeta.key,
    sceneLabel: sceneMeta.label,
    sceneCategory: sceneMeta.category,
    isScanEntry: sceneMeta.matched,
    query,
    inviteCode,
    inviteCodeSource,
    scenePayloadRaw: scenePayload.raw,
    scenePayloadDecoded: scenePayload.decoded,
    scenePayloadParams: scenePayload.params,
    referrerInfo: normalizeObject(normalizedOptions.referrerInfo)
  }
}

export { SCAN_SCENE_MAP }