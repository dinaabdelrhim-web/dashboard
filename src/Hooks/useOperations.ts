import { useQuery } from '@tanstack/react-query'
import { mockOperationsApi } from '../features/operations/mockOperationsApi'
import type { OperationFilters } from '../features/operations/types'

export const useOperations = (filters: OperationFilters) =>
  useQuery({
    queryKey: ['operations', filters],
    queryFn: ({ signal }) => mockOperationsApi.listOperations(filters, signal),
    staleTime: 0,
  })

export const useOperation = (id: string | null) =>
  useQuery({
    queryKey: ['operation', id],
    queryFn: ({ signal }) => {
      if (!id) {
        throw new Error('An operation ID is required.')
      }
      return mockOperationsApi.getOperation(id, signal)
    },
    enabled: id !== null,
  })
