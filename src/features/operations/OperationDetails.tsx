import type { Operation, OperationStatus } from './types'

interface OperationDetailsProps {
  operation: Operation
  updating: boolean
  onBack: () => void
  onStatusChange: (id: string, status: OperationStatus) => void
}

const statusLabels: Record<OperationStatus, string> = {
  Pending: 'Pending',
  Running: 'Running',
  Completed: 'Completed',
  Failed: 'Failed',
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'short',
})

export function OperationDetails({
  operation,
  updating,
  onBack,
  onStatusChange,
}: OperationDetailsProps) {
  return (
    <section className="details-view" aria-labelledby="details-title">
      <button className="back-button" onClick={onBack} type="button">
        <span aria-hidden="true">→</span>
        Back to operations
      </button>
      <div className="details-heading">
        <div>
          <p className="eyebrow" dir="ltr">{operation.id}</p>
          <h2 id="details-title">{operation.name}</h2>
        </div>
        <span className={`status-badge status-${operation.status.toLowerCase()}`}>
          <span className="status-dot" aria-hidden="true" />
          {statusLabels[operation.status]}
        </span>
      </div>
      <div className="details-grid">
        <div className="detail-card">
          <span>Owner</span>
          <strong>{operation.owner}</strong>
        </div>
        <div className="detail-card">
          <span>Team</span>
          <strong>{operation.team ?? '—'}</strong>
        </div>
        <div className="detail-card">
          <span>Stage</span>
          <strong>{operation.stage ?? '—'}</strong>
        </div>
        <div className="detail-card">
          <span>Due date</span>
          <strong>
            {operation.dueDate
              ? new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'medium',
                  timeZone: 'UTC',
                }).format(new Date(operation.dueDate))
              : '—'}
          </strong>
        </div>
        <div className="detail-card">
          <span>Created</span>
          <strong>{dateFormatter.format(new Date(operation.createdAt))}</strong>
        </div>
        <div className="detail-card">
          <span>Last updated</span>
          <strong>{dateFormatter.format(new Date(operation.updatedAt))}</strong>
        </div>
        <label className="detail-card status-control">
          <span>Change status</span>
          <select
            aria-label="Change operation status"
            disabled={updating}
            onChange={(event) =>
              onStatusChange(operation.id, event.target.value as OperationStatus)
            }
            value={operation.status}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
