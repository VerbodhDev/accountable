import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ApiError, api, type OrganizationDetail } from "../../lib/api"
import { websiteHref } from "../../lib/format"
import { money } from "../../lib/money"
import { ConfirmDialog } from "../Dialog"
import { organizationDeleteText } from "../deleteText"
import { ContactForm, DealForm, OrganizationForm } from "../Forms"
import { markStyle, type MarkName } from "../late"
import { LoadError, Missing, PageHeading } from "../../shell/Shell"

export function OrganizationPage() {
  const params = useParams()
  const navigate = useNavigate()
  const orgId = Number(params.id)
  const [org, setOrg] = useState<OrganizationDetail | null>(null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [addingDeal, setAddingDeal] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return api
      .organization(orgId)
      .then((row) => {
        setError(false)
        setMissing(false)
        setOrg(row)
      })
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.status === 404) setMissing(true)
        else setError(true)
      })
  }, [orgId])

  useEffect(() => {
    if (!Number.isInteger(orgId)) return
    void load()
  }, [orgId, load])

  if (!Number.isInteger(orgId) || missing) return <Missing />
  if (error) return <LoadError />
  if (!org) return <p>Loading records.</p>

  return (
    <>
      <PageHeading title={org.name}>
        <button type="button" className="quiet" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="quiet" onClick={() => setRemoving(true)}>
          Delete
        </button>
      </PageHeading>
      <section className="panel">
        <ul className="facts">
          <li>
            <span>Industry</span>
            <b>{org.industry || ""}</b>
          </li>
          <li>
            <span>Website</span>
            {org.website ? (
              <a href={websiteHref(org.website)} target="_blank" rel="noreferrer">
                {org.website}
              </a>
            ) : (
              <b></b>
            )}
          </li>
          {org.notes ? (
            <li>
              <span>Notes</span>
              <b>{org.notes}</b>
            </li>
          ) : null}
        </ul>
      </section>
      <section className="stack">
        <section className="panel">
          <div className="page-head">
            <h2>Contacts</h2>
            <button type="button" className="primary" onClick={() => setAddingContact(true)}>
              Add contact
            </button>
          </div>
          {org.contacts.length === 0 ? (
            <p className="empty">There are no records yet.</p>
          ) : (
            <ul className="facts">
              {org.contacts.map((contact) => (
                <li key={contact.id}>
                  <Link to={`/contacts/${contact.id}`}>{contact.name}</Link>
                  <span className="chip" style={markStyle(contact.status as MarkName)}>
                    {contact.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel">
          <div className="page-head">
            <h2>Deals</h2>
            <button type="button" className="primary" onClick={() => setAddingDeal(true)}>
              Add deal
            </button>
          </div>
          {org.deals.length === 0 ? (
            <p className="empty">There are no records yet.</p>
          ) : (
            <ul className="facts">
              {org.deals.map((deal) => (
                <li key={deal.id}>
                  <Link to={`/deals/${deal.id}`}>{deal.name}</Link>
                  <span className="mono">{money(deal.value_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
      {editing ? (
        <OrganizationForm
          initial={org}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            void load()
          }}
        />
      ) : null}
      {addingContact ? (
        <ContactForm
          organizations={[org]}
          organizationId={org.id}
          lockOrganization
          onCancel={() => setAddingContact(false)}
          onSaved={() => {
            setAddingContact(false)
            void load()
          }}
        />
      ) : null}
      {addingDeal ? (
        <DealForm
          organizations={[org]}
          contacts={org.contacts}
          organizationId={org.id}
          lockOrganization
          onCancel={() => setAddingDeal(false)}
          onSaved={() => {
            setAddingDeal(false)
            void load()
          }}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Delete organization"
          body={organizationDeleteText(org)}
          busy={busy}
          onCancel={() => setRemoving(false)}
          onConfirm={() => {
            setBusy(true)
            void api
              .deleteOrganization(org.id)
              .then(() => navigate("/organizations"))
              .catch(() => setBusy(false))
          }}
        />
      ) : null}
    </>
  )
}
