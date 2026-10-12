import type { Operation, OperationStatus } from './types'

interface OperationsTableProps {
  operations: Operation[]
  updatingOperationId?: string
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
  onOpen: (operation: Operation) => void
  onStatusChange: (id: string, status: OperationStatus) => void
}

const dueDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const statusLabels: Record<OperationStatus, string> = {
  Pending: 'Pending',
  Running: 'Running',
  Completed: 'Completed',
  Failed: 'Failed',
}

export function OperationsTable({
  operations,
  updatingOperationId,
  selectedIds,
  onToggle,
  onToggleAll,
  onOpen,
  onStatusChange,
}: OperationsTableProps) {
  const allSelected =
    operations.length > 0 && operations.every((operation) => selectedIds.includes(operation.id))

  return (
    <div className="table-scroll">
      <table className="operations-table">
        <thead>
          <tr>
            <th className="checkbox-cell" scope="col">
              <input
                aria-label="Select all processes on this page"
                checked={allSelected}
                onChange={onToggleAll}
                type="checkbox"
              />
            </th>
            <th scope="col">Process</th>
            <th scope="col">Team</th>
            <th scope="col">Stage</th>
            <th scope="col">Status</th>
            <th scope="col">Owner</th>
            <th scope="col">Due date</th>
            <th aria-label="Actions" scope="col" />
          </tr>
        </thead>
        <tbody>
          {operations.map((operation) => (
            <tr key={operation.id}>
              <td className="checkbox-cell">
                <input
                  aria-label={`Select ${operation.name}`}
                  checked={selectedIds.includes(operation.id)}
                  onChange={() => onToggle(operation.id)}
                  type="checkbox"
                />
              </td>
              <td className="operation-name">
                <span>{operation.name}</span>
                <small className="operation-id" dir="ltr">{operation.id}</small>
              </td>
              <td>{operation.team ?? '—'}</td>
              <td>{operation.stage ?? '—'}</td>
              <td>
                <span className={`status-badge status-${operation.status.toLowerCase()}`}>
                  <span className="status-dot" aria-hidden="true" />
                  {statusLabels[operation.status]}
                </span>
              </td>
              <td>{operation.owner}</td>
              <td className="date-cell">
                {operation.dueDate
                  ? dueDateFormatter.format(new Date(operation.dueDate))
                  : '—'}
              </td>
              <td className="row-actions">
                <button
                  aria-label={`Open details for ${operation.name}`}
                  className="icon-button details-button"
                  onClick={() => onOpen(operation)}
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20">
                    <circle cx="4" cy="10" r="1" />
                    <circle cx="10" cy="10" r="1" />
                    <circle cx="16" cy="10" r="1" />
                  </svg>
                </button>
                <select
                  aria-label={`Change status for operation ${operation.id}`}
                  className="status-select"
                  disabled={updatingOperationId === operation.id}
                  onChange={(event) =>
                    onStatusChange(operation.id, event.target.value as OperationStatus)
                  }
                  value={operation.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
