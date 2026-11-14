import type { ReactNode } from "react"

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <>
      <button type="button" className="backdrop" aria-label="Close" onClick={onClose} />
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </>
  )
}

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  )
}

export function ConfirmDialog({
  title,
  body,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <p>{body}</p>
      <div className="actions">
        <button type="button" className="quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="danger" onClick={onConfirm} disabled={busy}>
          Delete
        </button>
      </div>
    </Dialog>
  )
}
