import {
  useMutation,
  useQueries,
  useQuery
} from '@tanstack/vue-query'

import { queryClient } from '@/query-client'

export function useAppQuery (options) {
  return useQuery(options, queryClient)
}

export function useAppMutation (options) {
  return useMutation(options, queryClient)
}

export function useAppQueries (queries) {
  return useQueries(queries, queryClient)
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