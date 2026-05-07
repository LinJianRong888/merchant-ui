import { computed, isRef, ref, watch } from 'vue'

const queryCache = new Map()

function isPlainObject (value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function resolveSourceValue (value) {
  if (isRef(value)) {
    return value.value
  }

  return value
}

function resolveEnabled (value) {
  if (typeof value === 'function') {
    return Boolean(value())
  }

  if (isRef(value)) {
    return Boolean(value.value)
  }

  if (value === undefined) {
    return true
  }

  return Boolean(value)
}

function normalizeQueryKey (value) {
  const resolved = resolveSourceValue(value)

  if (Array.isArray(resolved)) {
    return resolved.map((item) => normalizeQueryKey(item))
  }

  if (isPlainObject(resolved)) {
    return Object.keys(resolved).sort().reduce((accumulator, key) => {
      accumulator[key] = normalizeQueryKey(resolved[key])
      return accumulator
    }, {})
  }

  return resolved
}

function serializeQueryKey (queryKey) {
  if (queryKey === undefined) {
    return ''
  }

  return JSON.stringify(normalizeQueryKey(queryKey))
}

function getRetryCount (retry) {
  if (retry === true) {
    return 3
  }

  if (typeof retry === 'number' && retry > 0) {
    return retry
  }

  return 0
}

async function executeWithRetry (queryFn, retry) {
  const retryCount = getRetryCount(retry)
  let currentAttempt = 0

  while (true) {
    try {
      return await queryFn()
    } catch (error) {
      if (currentAttempt >= retryCount) {
        throw error
      }

      currentAttempt += 1
    }
  }
}

function getCachedEntry (cacheKey, staleTime) {
  if (!cacheKey || !queryCache.has(cacheKey)) {
    return null
  }

  const entry = queryCache.get(cacheKey)

  if (!staleTime || staleTime <= 0) {
    return null
  }

  if (Date.now() - entry.updatedAt > staleTime) {
    return null
  }

  return entry
}

function buildQueryClient () {
  return {
    clear () {
      queryCache.clear()
    },

    invalidateQueries ({ queryKey } = {}) {
      const targetKey = serializeQueryKey(queryKey)

      if (!targetKey) {
        queryCache.clear()
        return
      }

      for (const cacheKey of queryCache.keys()) {
        if (cacheKey.startsWith(targetKey)) {
          queryCache.delete(cacheKey)
        }
      }
    },

    removeQueries ({ queryKey } = {}) {
      this.invalidateQueries({ queryKey })
    }
  }
}

const queryClient = buildQueryClient()

export function useAppQuery (options) {
  const data = ref(undefined)
  const error = ref(null)
  const isLoading = ref(false)
  const isFetching = ref(false)
  const isError = ref(false)
  const status = ref('idle')
  const fetchStatus = ref('idle')
  const hasResolved = ref(false)

  const normalizedOptions = computed(() => {
    const resolvedOptions = resolveSourceValue(options) || {}

    return {
      ...resolvedOptions,
      enabled: resolveEnabled(resolvedOptions.enabled),
      queryKey: normalizeQueryKey(resolvedOptions.queryKey)
    }
  })

  const cacheKey = computed(() => serializeQueryKey(normalizedOptions.value.queryKey))

  async function runQuery ({ force = false } = {}) {
    const currentOptions = normalizedOptions.value

    if (!currentOptions.enabled || typeof currentOptions.queryFn !== 'function') {
      return {
        data: data.value,
        error: error.value,
        status: status.value,
        fetchStatus: fetchStatus.value
      }
    }

    const currentCacheKey = cacheKey.value
    const cachedEntry = force ? null : getCachedEntry(currentCacheKey, currentOptions.staleTime)

    if (cachedEntry) {
      data.value = cachedEntry.data
      error.value = null
      isError.value = false
      isLoading.value = false
      isFetching.value = false
      status.value = 'success'
      fetchStatus.value = 'idle'

      return {
        data: data.value,
        error: null,
        status: status.value,
        fetchStatus: fetchStatus.value
      }
    }

    const shouldShowLoading = !hasResolved.value && data.value === undefined

    error.value = null
    isError.value = false
    isFetching.value = true
    fetchStatus.value = 'fetching'
    if (shouldShowLoading) {
      isLoading.value = true
    }

    try {
      const result = await executeWithRetry(currentOptions.queryFn, currentOptions.retry)

      data.value = result
      error.value = null
      isError.value = false
      status.value = 'success'
      hasResolved.value = true

      if (currentCacheKey) {
        queryCache.set(currentCacheKey, {
          data: result,
          updatedAt: Date.now()
        })
      }

      if (typeof currentOptions.onSuccess === 'function') {
        currentOptions.onSuccess(result)
      }

      return {
        data: result,
        error: null,
        status: status.value,
        fetchStatus: fetchStatus.value
      }
    } catch (queryError) {
      error.value = queryError
      isError.value = true
      status.value = 'error'
      hasResolved.value = true

      if (typeof currentOptions.onError === 'function') {
        currentOptions.onError(queryError)
      }

      throw queryError
    } finally {
      isLoading.value = false
      isFetching.value = false
      fetchStatus.value = 'idle'
    }
  }

  function refetch () {
    return runQuery({ force: true })
  }

  watch(
    [cacheKey, () => normalizedOptions.value.enabled],
    ([nextCacheKey, nextEnabled], [previousCacheKey]) => {
      if (!nextEnabled) {
        fetchStatus.value = 'idle'
        if (!hasResolved.value) {
          status.value = 'idle'
        }
        return
      }

      if (nextCacheKey !== previousCacheKey && normalizedOptions.value.keepPreviousData === false) {
        data.value = normalizedOptions.value.initialData
        hasResolved.value = false
      }

      void runQuery()
    },
    {
      immediate: true
    }
  )

  return {
    data,
    error,
    fetchStatus,
    isError,
    isFetching,
    isLoading,
    refetch,
    status
  }
}

export function useAppMutation (options) {
  const isPending = ref(false)
  const error = ref(null)

  async function mutateAsync (variables) {
    const resolvedOptions = resolveSourceValue(options) || {}

    if (typeof resolvedOptions.mutationFn !== 'function') {
      throw new Error('mutationFn is required')
    }

    isPending.value = true
    error.value = null

    try {
      const result = await resolvedOptions.mutationFn(variables)

      if (typeof resolvedOptions.onSuccess === 'function') {
        resolvedOptions.onSuccess(result, variables)
      }

      if (typeof resolvedOptions.onSettled === 'function') {
        resolvedOptions.onSettled(result, null, variables)
      }

      return result
    } catch (mutationError) {
      error.value = mutationError

      if (typeof resolvedOptions.onError === 'function') {
        resolvedOptions.onError(mutationError, variables)
      }

      if (typeof resolvedOptions.onSettled === 'function') {
        resolvedOptions.onSettled(undefined, mutationError, variables)
      }

      throw mutationError
    } finally {
      isPending.value = false
    }
  }

  function mutate (variables) {
    void mutateAsync(variables)
  }

  return {
    error,
    isPending,
    mutate,
    mutateAsync
  }
}

export function useAppQueries (queries) {
  const resolvedQueries = resolveSourceValue(queries)
  const queryList = Array.isArray(resolvedQueries)
    ? resolvedQueries
    : resolveSourceValue(resolvedQueries?.queries) || []

  return queryList.map((item) => useAppQuery(item))
}

export function useAppQueryClient () {
  return queryClient
}

export { queryClient }

export default {
  queryClient,
  useAppMutation,
  useAppQueries,
  useAppQuery,
  useAppQueryClient
}