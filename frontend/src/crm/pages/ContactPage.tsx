import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ApiError, api, type ContactDetail, type Organization } from "../../lib/api"
import { money } from "../../lib/money"
import { ConfirmDialog } from "../Dialog"
import { contactDeleteText } from "../deleteText"
import { ContactForm } from "../Forms"
import { markStyle, type MarkName } from "../late"
import { Timeline } from "../Timeline"
import { LoadError, Missing, PageHeading } from "../../shell/Shell"

export function ContactPage() {
  const params = useParams()
  const navigate = useNavigate()
  const contactId = Number(params.id)
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return api
      .contact(contactId)
      .then((row) => {
        setError(false)
        setMissing(false)
        setContact(row)
      })
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.status === 404) setMissing(true)
        else setError(true)
      })
  }, [contactId])

  useEffect(() => {
    if (!Number.isInteger(contactId)) return
    void load()
  }, [contactId, load])

  async function openEdit() {
    const data = await api.organizations()
    setOrganizations(data.items)
    setEditing(true)
  }

  if (!Number.isInteger(contactId) || missing) return <Missing />
  if (error) return <LoadError />
  if (!contact) return <p>Loading records.</p>

  return (
    <>
      <PageHeading title={contact.name}>
        <button type="button" className="quiet" onClick={() => void openEdit()}>
          Edit
        </button>
        <button type="button" className="quiet" onClick={() => setRemoving(true)}>
          Delete
        </button>
      </PageHeading>
      <section className="panel">
        <ul className="facts">
          <li>
            <span>Status</span>
            <span className="chip" style={markStyle(contact.status as MarkName)}>
              {contact.status}
            </span>
          </li>
          <li>
            <span>Email</span>
            <b>{contact.email || ""}</b>
          </li>
          <li>
            <span>Phone</span>
            <b>{contact.phone || ""}</b>
          </li>
          <li>
            <span>Job title</span>
            <b>{contact.job_title || ""}</b>
          </li>
          <li>
            <span>Organization</span>
            {contact.organization_id ? (
              <Link to={`/organizations/${contact.organization_id}`}>
                {contact.organization_name}
              </Link>
            ) : (
              <b>No organization</b>
            )}
          </li>
        </ul>
      </section>
      <section className="panel stack">
        <h2>Deals</h2>
        {contact.deals.length === 0 ? (
          <p className="empty">There are no records yet.</p>
        ) : (
          <ul className="facts">
            {contact.deals.map((deal) => (
              <li key={deal.id}>
                <Link to={`/deals/${deal.id}`}>{deal.name}</Link>
                <span className="mono">{money(deal.value_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Timeline
        items={contact.timeline}
        parentName={contact.name}
        contactId={contact.id}
        onChange={() => void load()}
      />
      {editing ? (
        <ContactForm
          initial={contact}
          organizations={organizations}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            void load()
          }}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Delete contact"
          body={contactDeleteText(contact)}
          busy={busy}
          onCancel={() => setRemoving(false)}
          onConfirm={() => {
            setBusy(true)
            void api
              .deleteContact(contact.id)
              .then(() => navigate("/contacts"))
              .catch(() => setBusy(false))
          }}
        />
      ) : null}
    </>
  )
}
