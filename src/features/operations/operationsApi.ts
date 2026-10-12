import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { mockOperationsApi } from './mockOperationsApi'
import type { Operation, OperationStats, OperationStatus } from './types'

interface ApiError {
  message: string
}

export const operationsApi = createApi({
  reducerPath: 'operationsApi',
  baseQuery: fakeBaseQuery<ApiError>(),
  tagTypes: ['OperationStats'],
  endpoints: (builder) => ({
    getOperationStats: builder.query<OperationStats, void>({
      queryFn: async (_argument, { signal }) => {
        try {
          return { data: await mockOperationsApi.getStats(signal) }
        } catch (error) {
          return {
            error:
              { message: error instanceof Error
                ? error.message
                : 'Unable to load operation statistics.' },
          }
        }
      },
      providesTags: ['OperationStats'],
    }),
    updateOperationStatus: builder.mutation<
      Operation,
      { id: string; status: OperationStatus }
    >({
      queryFn: async ({ id, status }, { signal }) => {
        try {
          return { data: await mockOperationsApi.updateStatus(id, status, signal) }
        } catch (error) {
          return {
            error:
              { message: error instanceof Error
                ? error.message
                : 'Unable to update the operation status.' },
          }
        }
      },
      invalidatesTags: ['OperationStats'],
    }),
  }),
})

export const {
  useGetOperationStatsQuery,
  useUpdateOperationStatusMutation,
} = operationsApi
