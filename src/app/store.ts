import { configureStore } from '@reduxjs/toolkit'
import { operationsApi } from '../features/operations/operationsApi'

export const createAppStore = () =>
  configureStore({
    reducer: {
      [operationsApi.reducerPath]: operationsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(operationsApi.middleware),
  })

export type AppStore = ReturnType<typeof createAppStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
