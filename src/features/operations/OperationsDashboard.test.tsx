import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from '../../app/store'
import { mockOperationsApi } from './mockOperationsApi'
import { OperationsDashboard } from './OperationsDashboard'
import type { Operation, OperationFilters, OperationPage } from './types'

const createOperation = (id: string, name: string): Operation => ({
  id,
  name,
  owner: 'Sarah Ahmed',
  status: 'Pending',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

const resultPage = (operation: Operation): OperationPage => ({
  items: [operation],
  total: 1,
  page: 1,
  pageSize: 50,
})

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  const store = createAppStore()

  render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
      <OperationsDashboard />
      </QueryClientProvider>
      </Provider>,
  )

  return { queryClient, store }
}

const searchBox = () =>
  screen.getByRole('searchbox', { name: 'Search by name or operation ID' })

beforeEach(() => {
  mockOperationsApi.reset()
  mockOperationsApi.setBehavior({ latency: () => 0, failureRate: 0 })
})

afterEach(() => {
  cleanup()
  mockOperationsApi.reset()
})

describe('OperationsDashboard', () => {
  it('combines name search and status filtering', async () => {
    renderDashboard()

    await screen.findByText('OP-05000')
    fireEvent.change(searchBox(), { target: { value: 'Process payments' } })
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'Failed' },
    })

    const matchingOperation = await screen.findByText('OP-04996')
    const rows = matchingOperation.closest('tbody')?.querySelectorAll('tr')
    expect(rows?.length).toBeGreaterThan(0)

    for (const row of Array.from(rows ?? [])) {
      expect(within(row).getByText('Process payments')).toBeInTheDocument()
      expect(
        within(row).getByText('Failed', { selector: '.status-badge' }),
      ).toBeInTheDocument()
    }
  })

  it('updates an operation status and refreshes the status counts', async () => {
    renderDashboard()

    await screen.findByTestId('count-Pending')
    fireEvent.change(searchBox(), { target: { value: 'OP-00001' } })
    await screen.findByText('OP-00001')

    fireEvent.change(
      screen.getByLabelText('Change status for operation OP-00001'),
      { target: { value: 'Completed' } },
    )

    await waitFor(() => {
      expect(screen.getByTestId('count-Pending')).toHaveTextContent(
        new Intl.NumberFormat('en-US').format(1249),
      )
      expect(screen.getByTestId('count-Completed')).toHaveTextContent(
        new Intl.NumberFormat('en-US').format(1251),
      )
    })
  })

  it('filters processes by team and stage', async () => {
    renderDashboard()

    await screen.findByText('OP-05000')
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'Sales' } })
    fireEvent.change(screen.getByLabelText('Stage'), { target: { value: 'Planning' } })

    const rows = await screen.findAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
    for (const row of rows.slice(1)) {
      expect(within(row).getByText('Sales')).toBeInTheDocument()
      expect(within(row).getByText('Planning')).toBeInTheDocument()
    }
  })

  it('creates a process from the New Process form', async () => {
    renderDashboard()

    await screen.findByText('OP-05000')
    fireEvent.click(screen.getByRole('button', { name: 'New Process' }))
    const createDialog = screen.getByRole('dialog')
    fireEvent.change(within(createDialog).getByLabelText('Process name'), {
      target: { value: 'Vendor contract review' },
    })
    fireEvent.change(within(createDialog).getByLabelText('Owner'), {
      target: { value: 'Sarah Ahmed' },
    })
    fireEvent.change(within(createDialog).getByLabelText('Team'), {
      target: { value: 'Finance' },
    })
    fireEvent.change(within(createDialog).getByLabelText('Stage'), {
      target: { value: 'In Review' },
    })
    fireEvent.change(within(createDialog).getByLabelText('Due date'), {
      target: { value: '2026-12-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create process' }))

    const createdProcess = await screen.findByText('Vendor contract review')
    const row = createdProcess.closest('tr')
    if (!row) {
      throw new Error('The created process was not rendered in a table row.')
    }
    expect(within(row).getByText('Finance')).toBeInTheDocument()
    expect(within(row).getByText('In Review')).toBeInTheDocument()
    expect(within(row).getByText('Pending', { selector: '.status-badge' })).toBeInTheDocument()
  })

  it('shows a retryable error when the operations request fails', async () => {
    mockOperationsApi.setBehavior({ failureRate: 1 })
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to reach the mock server',
    )
    expect(
      screen.getAllByRole('button', { name: 'Retry' }).length,
    ).toBeGreaterThan(0)
  })

  it('keeps the latest search result when an earlier response arrives later', async () => {
    const oldResult = createOperation('OLD-OP', 'Old result')
    const newResult = createOperation('NEW-OP', 'New result')
    const originalList = mockOperationsApi.listOperations.bind(mockOperationsApi)
    let oldResponseResolved = false

    vi.spyOn(mockOperationsApi, 'listOperations').mockImplementation(
      (filters: OperationFilters, signal?: AbortSignal) => {
        if (filters.search === 'old') {
          return new Promise((resolve) => {
            setTimeout(() => {
              oldResponseResolved = true
              resolve(resultPage(oldResult))
            }, 100)
          })
        }
        if (filters.search === 'new') {
          return Promise.resolve(resultPage(newResult))
        }
        return originalList(filters, signal)
      },
    )
    renderDashboard()

    await screen.findByText('OP-05000')
    fireEvent.change(searchBox(), { target: { value: 'old' } })
    fireEvent.change(searchBox(), { target: { value: 'new' } })

    expect(await screen.findByText('NEW-OP')).toBeInTheDocument()
    await waitFor(() => expect(oldResponseResolved).toBe(true))

    expect(screen.getByText('NEW-OP')).toBeInTheDocument()
    expect(screen.queryByText('OLD-OP')).not.toBeInTheDocument()
  })

  it('does not display the previous result while a new search is loading', async () => {
    const oldResult = createOperation('OLD-OP', 'Old result')
    const newResult = createOperation('NEW-OP', 'New result')
    const originalList = mockOperationsApi.listOperations.bind(mockOperationsApi)

    vi.spyOn(mockOperationsApi, 'listOperations').mockImplementation(
      (filters: OperationFilters, signal?: AbortSignal) => {
        if (filters.search === 'old') {
          return Promise.resolve(resultPage(oldResult))
        }
        if (filters.search === 'new') {
          return new Promise((resolve) => {
            setTimeout(() => resolve(resultPage(newResult)), 100)
          })
        }
        return originalList(filters, signal)
      },
    )
    renderDashboard()

    await screen.findByText('OP-05000')
    fireEvent.change(searchBox(), { target: { value: 'old' } })
    await screen.findByText('OLD-OP')
    fireEvent.change(searchBox(), { target: { value: 'new' } })

    expect(screen.queryByText('OLD-OP')).not.toBeInTheDocument()
    expect(await screen.findByText('NEW-OP')).toBeInTheDocument()
  })
})
