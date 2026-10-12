import {
  operationStatuses,
  operationStages,
  operationTeams,
  type Operation,
  type OperationFilters,
  type OperationPage,
  type OperationStats,
  type OperationStatus,
} from './types'

const operationNames = [
  'Inventory synchronization',
  'Create financial report',
  'Update customer data',
  'Process payments',
  'Archive records',
  'Export reports',
  'Review orders',
  'Database backup',
]

const owners = [
  'Sarah Ahmed',
  'Mohammed Khalid',
  'Noor Ali',
  'Omar Hassan',
  'Layla Ibrahim',
  'Yasser Mahmoud',
]

const seedOperations = (): Operation[] =>
  Array.from({ length: 5_000 }, (_, index) => {
    const createdAt = new Date(
      Date.UTC(2025, 0, 1) + index * 60 * 60 * 1_000,
    )
    const updatedAt = new Date(
      createdAt.getTime() + (index % 72) * 60 * 60 * 1_000,
    )

    return {
      id: `OP-${String(index + 1).padStart(5, '0')}`,
      name: operationNames[index % operationNames.length],
      owner: owners[index % owners.length],
      status: operationStatuses[index % operationStatuses.length],
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      team: operationTeams[index % operationTeams.length],
      stage: operationStages[index % operationStages.length],
      dueDate: new Date(
        Date.UTC(2026, 0, 1) + (index % 365) * 24 * 60 * 60 * 1_000,
      ).toISOString(),
    }
  })

export interface MockApiBehavior {
  latency?: (filters?: OperationFilters) => number
  failureRate?: number
}

const delay = (milliseconds: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The request was aborted.', 'AbortError'))
      return
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)

    const onAbort = () => {
      clearTimeout(timeout)
      reject(new DOMException('The request was aborted.', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })

export class MockOperationsApi {
  private operations = seedOperations()
  private behavior: Required<MockApiBehavior> = {
    latency: () => 180 + Math.floor(Math.random() * 620),
    failureRate: 0.035,
  }

  setBehavior(behavior: MockApiBehavior) {
    this.behavior = {
      ...this.behavior,
      ...behavior,
    }
  }

  reset() {
    this.operations = seedOperations()
    this.behavior = {
      latency: () => 180 + Math.floor(Math.random() * 620),
      failureRate: 0.035,
    }
  }

  private async request<T>(
    callback: () => T,
    signal?: AbortSignal,
    filters?: OperationFilters,
  ): Promise<T> {
    await delay(Math.max(0, this.behavior.latency(filters)), signal)

    if (Math.random() < this.behavior.failureRate) {
      throw new Error('Unable to reach the mock server. Please try again.')
    }

    return callback()
  }

  listOperations(
    filters: OperationFilters,
    signal?: AbortSignal,
  ): Promise<OperationPage> {
    return this.request(() => {
      const normalizedSearch = filters.search.trim().toLocaleLowerCase()
      const matching = this.operations
        .filter((operation) => {
          const matchesSearch =
            !normalizedSearch ||
            operation.id.toLocaleLowerCase().includes(normalizedSearch) ||
            operation.name.toLocaleLowerCase().includes(normalizedSearch)
          const matchesStatus =
            filters.status === 'All' || operation.status === filters.status
          const matchesTeam = !filters.team || operation.team === filters.team
          const matchesStage = !filters.stage || operation.stage === filters.stage
          const matchesCategory =
            !filters.category ||
            filters.category === 'All' ||
            (filters.category === 'Active' && operation.status === 'Running') ||
            (filters.category === 'Pending' && operation.status === 'Pending') ||
            (filters.category === 'Archived' &&
              (operation.status === 'Completed' || operation.status === 'Failed'))

          return matchesSearch && matchesStatus && matchesTeam && matchesStage && matchesCategory
        })
        .sort((first, second) => {
          const comparison = first[filters.sortBy].localeCompare(
            second[filters.sortBy],
          )
          return filters.sortOrder === 'asc' ? comparison : -comparison
        })

      const start = (filters.page - 1) * filters.pageSize

      return {
        items: matching.slice(start, start + filters.pageSize),
        total: matching.length,
        page: filters.page,
        pageSize: filters.pageSize,
      }
    }, signal, filters)
  }

  getOperation(id: string, signal?: AbortSignal): Promise<Operation> {
    return this.request(() => {
      const operation = this.operations.find((item) => item.id === id)
      if (!operation) {
        throw new Error('The requested operation was not found.')
      }
      return { ...operation }
    }, signal)
  }

  createOperation(input: {
    name: string
    owner: string
    team: string
    stage: string
    dueDate: string
  }): Promise<Operation> {
    return this.request(() => {
      const highestId = this.operations.reduce((highest, operation) => {
        const match = /^OP-(\d+)$/.exec(operation.id)
        return match ? Math.max(highest, Number(match[1])) : highest
      }, 0)
      const now = new Date().toISOString()
      const operation: Operation = {
        ...input,
        id: `OP-${String(highestId + 1).padStart(5, '0')}`,
        status: 'Pending',
        createdAt: now,
        updatedAt: now,
      }
      this.operations.unshift(operation)
      return { ...operation }
    })
  }

  getStats(signal?: AbortSignal): Promise<OperationStats> {
    return this.request(() => {
      const stats = Object.fromEntries(
        operationStatuses.map((status) => [status, 0]),
      ) as OperationStats

      for (const operation of this.operations) {
        stats[operation.status] += 1
      }

      return stats
    }, signal)
  }

  updateStatus(
    id: string,
    status: OperationStatus,
    signal?: AbortSignal,
  ): Promise<Operation> {
    return this.request(() => {
      const operation = this.operations.find((item) => item.id === id)
      if (!operation) {
        throw new Error('The requested operation was not found.')
      }

      operation.status = status
      operation.updatedAt = new Date().toISOString()
      return { ...operation }
    }, signal)
  }
}

export const mockOperationsApi = new MockOperationsApi()
