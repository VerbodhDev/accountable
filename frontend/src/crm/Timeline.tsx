import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { ApiError, api, type TimelineItem } from "../lib/api"
import { shortDate } from "../lib/format"
import { ConfirmDialog, Dialog, Field } from "./Dialog"
import { timelineDeleteText } from "./deleteText"

export function Timeline({
  items,
  parentName,
  stage,
  contactId,
  dealId,
  onChange,
}: {
  items: TimelineItem[]
  parentName: string
  stage?: string
  contactId?: number
  dealId?: number
  onChange: () => void
}) {
  const [type, setType] = useState("Note")
  const [description, setDescription] = useState("")
  const [followUp, setFollowUp] = useState("")
  const [error, setError] = useState("")
  const [field, setField] = useState("")
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<TimelineItem | null>(null)
  const [removing, setRemoving] = useState<TimelineItem | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setField("")
    try {
      await api.createActivity({
        type,
        description,
        follow_up_date: followUp || null,
        contact_id: contactId ?? null,
        deal_id: dealId ?? null,
      })
      setDescription("")
      setFollowUp("")
      onChange()
    } catch (caught) {
      if (caught instanceof ApiError) {
        setField(caught.field || "")
        setError(caught.message)
      } else {
        setError("Could not load records.")
      }
    } finally {
      setBusy(false)
    }
  }

  async function markDone(item: TimelineItem) {
    await api.updateActivity(item.id, { done: true })
    onChange()
  }

  return (
    <section className="stack">
      <section className="panel">
        <h2>Timeline</h2>
        {items.length === 0 ? <p className="empty">There are no records yet.</p> : null}
        <ul className="timeline">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <span className="when">{shortDate(item.happened_at)}</span>
              <div>
                <strong>{item.kind === "stage" ? item.title : item.type}</strong>
                {item.kind === "activity" ? <p>{item.description}</p> : null}
                {item.kind === "activity" && item.follow_up_date ? (
                  <p>Follow-up {shortDate(item.follow_up_date)}</p>
                ) : null}
                {item.kind === "activity" && item.done ? <p>Done</p> : null}
                {item.record_type === "deal" && contactId ? (
                  <p>
                    <Link to={`/deals/${item.record_id}`}>{item.record_name}</Link>
                  </p>
                ) : null}
              </div>
              <div className="actions">
                {item.kind === "activity" && !item.done ? (
                  <button type="button" className="primary" onClick={() => void markDone(item)}>
                    Mark done
                  </button>
                ) : null}
                {item.kind === "activity" ? (
                  <button type="button" className="quiet" onClick={() => setEditing(item)}>
                    Edit
                  </button>
                ) : null}
                <button type="button" className="quiet" onClick={() => setRemoving(item)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel log">
        <h2>Log activity</h2>
        <form onSubmit={onSubmit}>
          <Field label="Type" error={field === "type" ? error : undefined}>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option>Note</option>
              <option>Call</option>
              <option>Email</option>
            </select>
          </Field>
          <Field
            label="Description"
            error={field === "description" || field === "parent" ? error : undefined}
          >
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field label="Follow-up date" error={field === "follow_up_date" ? error : undefined}>
            <input
              type="date"
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
            />
          </Field>
          {error && !field ? <p className="field-error">{error}</p> : null}
          <button type="submit" className="primary" disabled={busy}>
            Log
          </button>
        </form>
      </section>
      {editing ? (
        <ActivityEdit
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChange()
          }}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Delete"
          body={timelineDeleteText(removing, parentName, stage)}
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            setBusy(true)
            const action =
              removing.kind === "stage"
                ? api.deleteStageEntry(removing.id)
                : api.deleteActivity(removing.id)
            void action
              .then(() => {
                setRemoving(null)
                setBusy(false)
                onChange()
              })
              .catch(() => setBusy(false))
          }}
        />
      ) : null}
    </section>
  )
}

function ActivityEdit({
  item,
  onClose,
  onSaved,
}: {
  item: TimelineItem
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState(item.type || "Note")
  const [description, setDescription] = useState(item.description || "")
  const [followUp, setFollowUp] = useState(item.follow_up_date || "")
  const [error, setError] = useState<FieldErrorState>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.updateActivity(item.id, { type, description, follow_up_date: followUp || null })
      onSaved()
    } catch (caught) {
      if (caught instanceof ApiError)
        setError({ field: caught.field || "", message: caught.message })
      else setError({ field: "", message: "Could not load records." })
      setBusy(false)
    }
  }

  return (
    <Dialog title="Edit activity" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <Field label="Type" error={error?.field === "type" ? error.message : undefined}>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option>Note</option>
            <option>Call</option>
            <option>Email</option>
          </select>
        </Field>
        <Field
          label="Description"
          error={error?.field === "description" ? error.message : undefined}
        >
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Field
          label="Follow-up date"
          error={error?.field === "follow_up_date" ? error.message : undefined}
        >
          <input
            type="date"
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
          />
        </Field>
        <div className="actions">
          <button type="button" className="quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </Dialog>
  )
}

type FieldErrorState = { field: string; message: string } | null
