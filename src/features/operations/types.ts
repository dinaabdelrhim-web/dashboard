export const operationStatuses = [
  'Pending',
  'Running',
  'Completed',
  'Failed',
] as const

export const operationTeams = ['Sales', 'Marketing', 'Operations', 'Finance'] as const
export const operationStages = ['Planning', 'In Review', 'Execution', 'Complete'] as const
export const operationCategories = ['All', 'Active', 'Pending', 'Archived'] as const

export type OperationStatus = (typeof operationStatuses)[number]
export type OperationSortField = 'createdAt' | 'updatedAt'
export type OperationCategory = (typeof operationCategories)[number]

export interface Operation {
  id: string
  name: string
  owner: string
  status: OperationStatus
  createdAt: string
  updatedAt: string
  team?: string
  stage?: string
  dueDate?: string
}

export interface OperationFilters {
  search: string
  status: OperationStatus | 'All'
  sortBy: OperationSortField
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
  team?: string
  stage?: string
  category?: OperationCategory
}

export interface OperationPage {
  items: Operation[]
  total: number
  page: number
  pageSize: number
}

export type OperationStats = Record<OperationStatus, number>
