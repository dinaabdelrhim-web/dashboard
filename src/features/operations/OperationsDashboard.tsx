import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOperation, useOperations } from '../../Hooks/useOperations'
import { mockOperationsApi } from './mockOperationsApi'
import {
  operationCategories,
  operationStages,
  operationTeams,
  operationStatuses,
  type Operation,
  type OperationCategory,
  type OperationFilters,
  type OperationStatus,
} from './types'
import {
  useGetOperationStatsQuery,
  useUpdateOperationStatusMutation,
} from './operationsApi'
import { OperationDetails } from './OperationDetails'
import { OperationsTable } from './OperationsTable'

const pageSize = 50

const statusLabels: Record<OperationStatus, string> = {
  Pending: 'Pending',
  Running: 'Running',
  Completed: 'Completed',
  Failed: 'Failed',
}

interface NewProcessForm {
  name: string
  owner: string
  team: string
  stage: string
  dueDate: string
}

export function OperationsDashboard() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OperationFilters['status']>('All')
  const [sortOrder, setSortOrder] = useState<OperationFilters['sortOrder']>('desc')
  const [team, setTeam] = useState('')
  const [stage, setStage] = useState('')
  const [category, setCategory] = useState<OperationCategory>('All')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [range, setRange] = useState('30')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const [newProcess, setNewProcess] = useState<NewProcessForm>({
    name: '',
    owner: '',
    team: operationTeams[0],
    stage: operationStages[0],
    dueDate: '',
  })

  const filters = useMemo<OperationFilters>(
    () => ({ search, status, sortBy: 'createdAt', sortOrder, page, pageSize, team, stage, category }),
    [search, status, sortOrder, page, team, stage, category],
  )
  const operationsQuery = useOperations(filters)
  const detailsQuery = useOperation(selectedOperationId)
  const statsQuery = useGetOperationStatsQuery()
  const [updateStatus, updateState] = useUpdateOperationStatusMutation()
  const selectedOperation = detailsQuery.data

  const changeFilter = (change: () => void) => {
    change()
    setPage(1)
  }

  const exportOperations = async () => {
    setIsExporting(true)
    setNotice('')
    try {
      const result = await mockOperationsApi.listOperations({
        ...filters,
        page: 1,
        pageSize: statsQuery.data
          ? Object.values(statsQuery.data).reduce((sum, count) => sum + count, 0)
          : pageSize,
      })
      const rows = [
        ['Process ID', 'Process', 'Team', 'Stage', 'Status', 'Owner', 'Due date'],
        ...result.items.map((operation) => [
          operation.id,
          operation.name,
          operation.team ?? '',
          operation.stage ?? '',
          operation.status,
          operation.owner,
          operation.dueDate ?? '',
        ]),
      ]
      const csv = rows
        .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
        .join('\r\n')
      const file = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = 'opsflow-processes.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to export processes.')
    } finally {
      setIsExporting(false)
    }
  }

  const createProcess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCreating(true)
    setNotice('')
    try {
      await mockOperationsApi.createOperation(newProcess)
      await queryClient.invalidateQueries({ queryKey: ['operations'] })
      await statsQuery.refetch()
      setIsCreateOpen(false)
      setNewProcess({
        name: '',
        owner: '',
        team: operationTeams[0],
        stage: operationStages[0],
        dueDate: '',
      })
      setNotice('Process created successfully.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to create the process.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStatusChange = async (id: string, nextStatus: OperationStatus) => {
    setNotice('')
    try {
      await updateStatus({ id, status: nextStatus }).unwrap()
      await queryClient.invalidateQueries({ queryKey: ['operations'] })
      await queryClient.invalidateQueries({ queryKey: ['operation', id] })
      setNotice('Operation status updated successfully.')
    } catch (error) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Unable to update the operation status. Please try again.'
      setNotice(message)
    }
  }

  const openOperation = (operation: Operation) => {
    setSelectedOperationId(operation.id)
  }

  const toggleOperation = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    )
  }

  const toggleVisibleOperations = () => {
    const visibleIds = operationsQuery.data?.items.map((operation) => operation.id) ?? []
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id))
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    )
  }

  return (
    <main className="dashboard-shell" dir="ltr">
      <header className="topbar">
        <a aria-label="Operations dashboard home" className="brand" href="/">
          <svg aria-hidden="true" className="brand-mark" viewBox="0 0 48 48">
            <path d="M24 4a20 20 0 0 1 18.4 12.1l-5.2 2.2A14.4 14.4 0 0 0 13.5 11l3.1 3.8-13-1.1 5-12 1.2 4A19.8 19.8 0 0 1 24 4Z" />
            <path d="M44 24a20 20 0 0 1-12.1 18.4l-2.2-5.2A14.4 14.4 0 0 0 37 13.5l-3.8 3.1 1.1-13 12 5-4 1.2A19.8 19.8 0 0 1 44 24Z" />
            <path d="M24 44A20 20 0 0 1 5.6 31.9l5.2-2.2A14.4 14.4 0 0 0 34.5 37l-3.1-3.8 13 1.1-5 12-1.2-4A19.8 19.8 0 0 1 24 44Z" />
            <path d="M4 24A20 20 0 0 1 16.1 5.6l2.2 5.2A14.4 14.4 0 0 0 11 34.5l3.8-3.1-1.1 13-12-5 4-1.2A19.8 19.8 0 0 1 4 24Z" />
            <path className="brand-check" d="m15.8 24.3 5.2 5.1 11.3-12" />
          </svg>
          <span className="brand-name">Ops<span>Flow</span></span>
        </a>
        <div className="topbar-actions">
          <button
            aria-label="Focus process search"
            className="icon-button"
            onClick={() => searchInput.current?.focus()}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="10.8" cy="10.8" r="6.6" />
              <path d="m16 16 4.2 4.2" />
            </svg>
          </button>
          <div className="notification-wrap">
            <button
              aria-expanded={notificationsOpen}
              aria-label="Notifications"
              className="icon-button notification-button"
              onClick={() => setNotificationsOpen((open) => !open)}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              <span className="notification-dot" />
            </button>
            {notificationsOpen ? (
              <div className="notification-popover" role="status">
                <strong>You're all caught up</strong>
                <span>No new notifications.</span>
              </div>
            ) : null}
          </div>
          <button className="primary-button" onClick={() => setIsCreateOpen(true)} type="button">
            <span aria-hidden="true">+</span>
            New Process
          </button>
          <button aria-label="User: Sarah Ahmed" className="avatar" type="button">S</button>
        </div>
      </header>

      <section className="dashboard-content">
        <section className="overview-grid" aria-label="Process overview">
          <div className="stats-grid" aria-label="Process statistics">
            {(['Running', 'Pending', 'Completed'] as const).map((operationStatus) => (
              <article
                className={`stat-card ${operationStatus === 'Running' ? 'stat-card-active' : ''}`}
                key={operationStatus}
              >
                <span className={`stat-icon stat-icon-${operationStatus.toLowerCase()}`} aria-hidden="true">
                  {operationStatus === 'Pending' ? '◷' : operationStatus === 'Running' ? '↻' : '✓'}
                </span>
                <div className="stat-copy">
                  {statsQuery.isLoading ? (
                    <div aria-label="Loading statistics" className="skeleton stat-skeleton" />
                  ) : statsQuery.isError ? (
                    <button className="retry-link" onClick={() => statsQuery.refetch()} type="button">
                      Retry
                    </button>
                  ) : statsQuery.data ? (
                    <strong data-testid={`count-${operationStatus}`}>
                      {statsQuery.data[operationStatus].toLocaleString('en-US')}
                    </strong>
                  ) : (
                    <strong aria-label="Statistics unavailable">—</strong>
                  )}
                  <span>{operationStatus === 'Running' ? 'Active' : statusLabels[operationStatus]}</span>
                </div>
              </article>
            ))}
          </div>

          <section className="chart-card" aria-labelledby="chart-title">
            <div className="chart-heading">
              <h2 id="chart-title">Processes in the Last {range} Days</h2>
              <label className="sr-only" htmlFor="chart-range">Chart date range</label>
              <select id="chart-range" onChange={(event) => setRange(event.target.value)} value={range}>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
            <div className="chart-plot">
              <div aria-hidden="true" className="chart-y-labels"><span>16</span><span>12</span><span>8</span><span>0</span></div>
              <svg aria-label="Completed and pending processes over time" className="chart-svg" role="img" viewBox="0 0 360 132">
                <defs>
                  <linearGradient id="completed-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#419b66" stopOpacity=".18" />
                    <stop offset="100%" stopColor="#419b66" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="pending-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#e98432" stopOpacity=".13" />
                    <stop offset="100%" stopColor="#e98432" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="chart-gridline" d="M0 14H360M0 48H360M0 82H360M0 116H360" />
                <path d="M0 84 C20 78 30 49 55 58 S94 84 120 83 S159 55 184 39 S222 48 245 48 S290 54 310 47 S341 21 360 14 V116 H0Z" fill="url(#completed-fill)" />
                <path d="M0 106 C35 106 43 101 70 101 S103 95 120 94 S157 82 184 76 S222 89 245 88 S290 83 310 81 S343 67 360 63 V116 H0Z" fill="url(#pending-fill)" />
                <path className="chart-line chart-line-completed" d="M0 84 C20 78 30 49 55 58 S94 84 120 83 S159 55 184 39 S222 48 245 48 S290 54 310 47 S341 21 360 14" />
                <path className="chart-line chart-line-pending" d="M0 106 C35 106 43 101 70 101 S103 95 120 94 S157 82 184 76 S222 89 245 88 S290 83 310 81 S343 67 360 63" />
                <circle className="chart-point-completed" cx="120" cy="83" r="5" />
                <circle className="chart-point-completed" cx="290" cy="50" r="5" />
                <circle className="chart-point-pending" cx="120" cy="94" r="5" />
                <circle className="chart-point-pending" cx="290" cy="81" r="5" />
              </svg>
            </div>
            <div className="chart-x-labels" aria-hidden="true"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span></div>
            <div className="chart-legend">
              <span><i className="legend-completed" />Completed</span>
              <span><i className="legend-pending" />Pending</span>
            </div>
          </section>
        </section>

        <section className="operations-panel" aria-label="Operations list">
          {selectedOperationId ? (
            detailsQuery.isPending ? (
              <div className="state-panel" role="status">
                <span className="spinner" />
                Loading operation details...
              </div>
            ) : detailsQuery.isError ? (
              <div className="state-panel state-error" role="alert">
                <p>{detailsQuery.error.message}</p>
                <button className="secondary-button" onClick={() => detailsQuery.refetch()} type="button">
                  Retry
                </button>
                <button className="text-button" onClick={() => setSelectedOperationId(null)} type="button">
                  Back to list
                </button>
              </div>
            ) : selectedOperation ? (
              <OperationDetails
                operation={selectedOperation}
                updating={updateState.isLoading}
                onBack={() => setSelectedOperationId(null)}
                onStatusChange={handleStatusChange}
              />
            ) : null
          ) : (
            <>
              <div className="panel-heading">
                <h1>All Processes</h1>
                <span className="results-count">
                  {operationsQuery.data ? `${operationsQuery.data.total.toLocaleString('en-US')} processes` : ''}
                </span>
              </div>

              <div className="toolbar">
                <label className="filter-field">
                  <span className="sr-only">Team</span>
                  <select
                    aria-label="Team"
                    onChange={(event) => changeFilter(() => setTeam(event.target.value))}
                    value={team}
                  >
                    <option value="">Team</option>
                    {operationTeams.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="filter-field">
                  <span className="sr-only">Stage</span>
                  <select
                    aria-label="Stage"
                    onChange={(event) => changeFilter(() => setStage(event.target.value))}
                    value={stage}
                  >
                    <option value="">Stage</option>
                    {operationStages.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="search-field">
                  <svg aria-hidden="true" className="search-icon" viewBox="0 0 24 24">
                    <circle cx="10.8" cy="10.8" r="6.6" />
                    <path d="m16 16 4.2 4.2" />
                  </svg>
                  <span className="sr-only">Search by name or operation ID</span>
                  <input
                    ref={searchInput}
                    onChange={(event) =>
                      changeFilter(() => setSearch(event.target.value))
                    }
                    placeholder="Search processes..."
                    type="search"
                    value={search}
                  />
                  {operationsQuery.isFetching && operationsQuery.data ? (
                    <span className="inline-spinner" aria-label="Updating results" />
                  ) : null}
                </label>

                <label className="filter-field">
                  <span className="sr-only">Status</span>
                  <select
                    aria-label="Status"
                    onChange={(event) =>
                      changeFilter(() =>
                        setStatus(event.target.value as OperationFilters['status']),
                      )
                    }
                    value={status}
                  >
                    <option value="All">All statuses</option>
                    {operationStatuses.map((item) => (
                      <option key={item} value={item}>{statusLabels[item]}</option>
                    ))}
                  </select>
                </label>

                <button
                  aria-label={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                  className="sort-direction"
                  onClick={() =>
                    changeFilter(() =>
                      setSortOrder((current) => current === 'desc' ? 'asc' : 'desc'),
                    )
                  }
                  type="button"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>

              <div className="process-tabs" role="tablist" aria-label="Process categories">
                {operationCategories.filter((item) => item !== 'All').map((item) => (
                  <button
                    aria-selected={category === item}
                    className={`process-tab ${category === item ? `process-tab-${item.toLowerCase()} is-selected` : ''}`}
                    key={item}
                    onClick={() => changeFilter(() => {
                      setCategory(category === item ? 'All' : item)
                      setStatus('All')
                    })}
                    role="tab"
                    type="button"
                  >
                    <span aria-hidden="true">{item === 'Active' ? '↻' : item === 'Pending' ? '◷' : '▰'}</span>
                    {item}
                  </button>
                ))}
              </div>

              {notice ? (
                <p className={`notice ${updateState.isError ? 'notice-error' : ''}`} role="status">
                  {notice}
                </p>
              ) : null}

              {operationsQuery.isPending ? (
                <div className="state-panel" role="status">
                  <span className="spinner" />
                  Loading operations...
                </div>
              ) : operationsQuery.isError ? (
                <div className="state-panel state-error" role="alert">
                  <p>{operationsQuery.error.message}</p>
                  <button className="secondary-button" onClick={() => operationsQuery.refetch()} type="button">
                    Retry
                  </button>
                </div>
              ) : operationsQuery.data.items.length === 0 ? (
                <div className="state-panel empty-state">
                  <span className="empty-icon" aria-hidden="true">⌕</span>
                  <strong>No matching operations</strong>
                  <p>Try changing your search terms or filters.</p>
                </div>
              ) : (
                <>
                  {operationsQuery.isFetching ? (
                    <div className="refresh-line" role="status">Updating results...</div>
                  ) : null}
                  <OperationsTable
                    operations={operationsQuery.data.items}
                    updatingOperationId={updateState.isLoading ? updateState.originalArgs?.id : undefined}
                    selectedIds={selectedIds}
                    onToggle={toggleOperation}
                    onToggleAll={toggleVisibleOperations}
                    onOpen={openOperation}
                    onStatusChange={handleStatusChange}
                  />
                  <div className="list-actions">
                    <label className="select-all-label">
                      <input
                        aria-label="Select all processes on this page"
                        checked={
                          operationsQuery.data.items.length > 0 &&
                          operationsQuery.data.items.every((operation) => selectedIds.includes(operation.id))
                        }
                        onChange={toggleVisibleOperations}
                        type="checkbox"
                      />
                      {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'All Processes'}
                    </label>
                    <button className="export-button" disabled={isExporting} onClick={exportOperations} type="button">
                      {isExporting ? 'Exporting...' : 'Export to CSV'}
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                  <div className="pagination">
                    <span>
                      Page {page.toLocaleString('en-US')} of{' '}
                      {Math.max(1, Math.ceil(operationsQuery.data.total / pageSize)).toLocaleString('en-US')}
                    </span>
                    <div>
                      <button
                        className="secondary-button"
                        disabled={page <= 1 || operationsQuery.isFetching}
                        onClick={() => setPage((current) => current - 1)}
                        type="button"
                      >
                        Previous
                      </button>
                      <button
                        className="secondary-button"
                        disabled={page * pageSize >= operationsQuery.data.total || operationsQuery.isFetching}
                        onClick={() => setPage((current) => current + 1)}
                        type="button"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </section>
      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)} role="presentation">
          <section
            aria-labelledby="create-process-title"
            aria-modal="true"
            className="create-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">OpsFlow</p>
                <h2 id="create-process-title">Create a new process</h2>
              </div>
              <button aria-label="Close" className="icon-button" onClick={() => setIsCreateOpen(false)} type="button">×</button>
            </div>
            <form className="create-form" onSubmit={createProcess}>
              <label>
                Process name
                <input
                  autoFocus
                  onChange={(event) => setNewProcess((current) => ({ ...current, name: event.target.value }))}
                  required
                  value={newProcess.name}
                />
              </label>
              <label>
                Owner
                <input
                  onChange={(event) => setNewProcess((current) => ({ ...current, owner: event.target.value }))}
                  required
                  value={newProcess.owner}
                />
              </label>
              <div className="create-form-row">
                <label>
                  Team
                  <select
                    onChange={(event) => setNewProcess((current) => ({ ...current, team: event.target.value }))}
                    value={newProcess.team}
                  >
                    {operationTeams.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Stage
                  <select
                    onChange={(event) => setNewProcess((current) => ({ ...current, stage: event.target.value }))}
                    value={newProcess.stage}
                  >
                    {operationStages.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
              <label>
                Due date
                <input
                  onChange={(event) => setNewProcess((current) => ({ ...current, dueDate: event.target.value }))}
                  required
                  type="date"
                  value={newProcess.dueDate}
                />
              </label>
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setIsCreateOpen(false)} type="button">Cancel</button>
                <button className="primary-button" disabled={isCreating} type="submit">
                  {isCreating ? 'Creating...' : 'Create process'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
