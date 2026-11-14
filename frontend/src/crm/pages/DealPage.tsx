import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ApiError, api, type Contact, type DealDetail, type Organization } from "../../lib/api"
import { shortDate } from "../../lib/format"
import { money } from "../../lib/money"
import { ConfirmDialog } from "../Dialog"
import { dealDeleteText } from "../deleteText"
import { DealForm } from "../Forms"
import { isLate, markStyle } from "../late"
import { STAGE_COLOR, stageInk } from "../stages"
import { Timeline } from "../Timeline"
import { LoadError, Missing, PageHeading } from "../../shell/Shell"

export function DealPage() {
  const params = useParams()
  const navigate = useNavigate()
  const dealId = Number(params.id)
  const [deal, setDeal] = useState<DealDetail | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return api
      .deal(dealId)
      .then((row) => {
        setError(false)
        setMissing(false)
        setDeal(row)
      })
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.status === 404) setMissing(true)
        else setError(true)
      })
  }, [dealId])

  useEffect(() => {
    if (!Number.isInteger(dealId)) return
    void load()
  }, [dealId, load])

  async function openEdit() {
    const [orgs, people] = await Promise.all([api.organizations(), api.contacts()])
    setOrganizations(orgs.items)
    setContacts(people.items)
    setEditing(true)
  }

  if (!Number.isInteger(dealId) || missing) return <Missing />
  if (error) return <LoadError />
  if (!deal) return <p>Loading records.</p>

  const late = isLate(deal.stage, deal.close_date, deal.today)

  return (
    <>
      <PageHeading title={deal.name}>
        {late ? (
          <span className="pill" style={markStyle("Late")}>
            Late
          </span>
        ) : null}
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
            <span>Organization</span>
            <Link to={`/organizations/${deal.organization_id}`}>{deal.organization_name}</Link>
          </li>
          <li>
            <span>Main contact</span>
            {deal.contact_id ? (
              <Link to={`/contacts/${deal.contact_id}`}>{deal.contact_name}</Link>
            ) : (
              <b>No main contact</b>
            )}
          </li>
          <li>
            <span>Stage</span>
            <span
              className="chip"
              style={{ background: STAGE_COLOR[deal.stage], color: stageInk(deal.stage) }}
            >
              {deal.stage}
            </span>
          </li>
          <li>
            <span>Value</span>
            <b className="mono">{money(deal.value_cents)}</b>
          </li>
          <li>
            <span>Expected revenue</span>
            <b className="mono">{money(deal.expected_cents)}</b>
          </li>
          <li>
            <span>Probability</span>
            <b className="mono">{deal.probability}</b>
          </li>
          <li>
            <span>Close date</span>
            <b className="mono">{shortDate(deal.close_date)}</b>
          </li>
          {deal.added_by_name ? (
            <li>
              <span>Added by</span>
              <b>{deal.added_by_name}</b>
            </li>
          ) : null}
        </ul>
      </section>
      <Timeline
        items={deal.timeline}
        parentName={deal.name}
        stage={deal.stage}
        dealId={deal.id}
        onChange={() => void load()}
      />
      {editing ? (
        <DealForm
          initial={deal}
          organizations={organizations}
          contacts={contacts}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            void load()
          }}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Delete deal"
          body={dealDeleteText(deal)}
          busy={busy}
          onCancel={() => setRemoving(false)}
          onConfirm={() => {
            setBusy(true)
            void api
              .deleteDeal(deal.id)
              .then(() => navigate("/deals"))
              .catch(() => setBusy(false))
          }}
        />
      ) : null}
    </>
  )
}
