import { useState, type FormEvent } from "react"
import { ApiError, api, type Contact, type Deal, type Organization } from "../lib/api"
import { dollarInput } from "../lib/money"
import { Dialog, Field } from "./Dialog"
import { STAGES, USUAL_PROBABILITY } from "./stages"

type FieldError = { field: string; message: string }

function takeError(error: unknown): FieldError {
  if (error instanceof ApiError) return { field: error.field || "", message: error.message }
  return { field: "", message: "Could not load records." }
}

function messageFor(error: FieldError | null, field: string) {
  if (error?.field !== field) return undefined
  return error.message
}

function looseError(error: FieldError | null) {
  if (!error || error.field) return null
  return <p className="field-error">{error.message}</p>
}

function dialogTitle(editing: boolean, edit: string, add: string) {
  return editing ? edit : add
}

function textOrEmpty(value: string | null | undefined) {
  return value ?? ""
}

function idText(value: number | null | undefined, fallback: number | null | undefined = null) {
  return String(value ?? fallback ?? "")
}

function dealStage(initial: Deal | null | undefined, defaultStage?: string) {
  return initial?.stage ?? defaultStage ?? "New"
}

function dealValue(initial: Deal | null | undefined) {
  if (!initial) return ""
  return dollarInput(initial.value_cents)
}

function dealProbability(initial: Deal | null | undefined) {
  if (!initial?.probability_hand_set) return ""
  return String(initial.probability)
}

function contactsAtOrg(contacts: Contact[], orgId: string) {
  return contacts.filter((contact) => String(contact.organization_id ?? "") === orgId)
}

function visibleContact(contacts: Contact[], contactId: string, orgId: string) {
  const selected = contacts.find((contact) => String(contact.id) === contactId)
  if (!selected || String(selected.organization_id ?? "") !== orgId) return ""
  return contactId
}

function usualLabel(stage: string) {
  return `Usual is ${USUAL_PROBABILITY[stage] ?? ""}`
}

export function OrganizationForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Organization | null
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(textOrEmpty(initial?.name))
  const [website, setWebsite] = useState(textOrEmpty(initial?.website))
  const [industry, setIndustry] = useState(textOrEmpty(initial?.industry))
  const [notes, setNotes] = useState(textOrEmpty(initial?.notes))
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const body = { name, website, industry, notes }
    try {
      if (initial) await api.updateOrganization(initial.id, body)
      else await api.createOrganization(body)
      onSaved()
    } catch (caught) {
      setError(takeError(caught))
      setBusy(false)
    }
  }

  return (
    <Dialog
      title={dialogTitle(Boolean(initial), "Edit organization", "Add organization")}
      onClose={onCancel}
    >
      <form onSubmit={onSubmit}>
        <Field label="Name" error={messageFor(error, "name")}>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Website" error={messageFor(error, "website")}>
          <input value={website} onChange={(event) => setWebsite(event.target.value)} />
        </Field>
        <Field label="Industry" error={messageFor(error, "industry")}>
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} />
        </Field>
        <Field label="Notes" error={messageFor(error, "notes")}>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        {looseError(error)}
        <div className="actions">
          <button type="button" className="quiet" onClick={onCancel}>
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

export function ContactForm({
  initial,
  organizations,
  organizationId,
  lockOrganization,
  onCancel,
  onSaved,
}: {
  initial?: Contact | null
  organizations: Organization[]
  organizationId?: number | null
  lockOrganization?: boolean
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(textOrEmpty(initial?.name))
  const [email, setEmail] = useState(textOrEmpty(initial?.email))
  const [phone, setPhone] = useState(textOrEmpty(initial?.phone))
  const [jobTitle, setJobTitle] = useState(textOrEmpty(initial?.job_title))
  const [orgId, setOrgId] = useState(idText(initial?.organization_id, organizationId))
  const [status, setStatus] = useState(initial?.status ?? "Lead")
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const body = {
      name,
      email,
      phone,
      job_title: jobTitle,
      organization_id: orgId ? Number(orgId) : null,
      status,
    }
    try {
      if (initial) await api.updateContact(initial.id, body)
      else await api.createContact(body)
      onSaved()
    } catch (caught) {
      setError(takeError(caught))
      setBusy(false)
    }
  }

  return (
    <Dialog title={dialogTitle(Boolean(initial), "Edit contact", "Add contact")} onClose={onCancel}>
      <form onSubmit={onSubmit}>
        <Field label="Name" error={messageFor(error, "name")}>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email" error={messageFor(error, "email")}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Phone" error={messageFor(error, "phone")}>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Job title" error={messageFor(error, "job_title")}>
          <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
        </Field>
        <Field label="Organization" error={messageFor(error, "organization_id")}>
          <select
            value={orgId}
            disabled={lockOrganization}
            onChange={(event) => setOrgId(event.target.value)}
          >
            <option value="">No organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" error={messageFor(error, "status")}>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>Lead</option>
            <option>Qualified</option>
            <option>Customer</option>
          </select>
        </Field>
        {looseError(error)}
        <div className="actions">
          <button type="button" className="quiet" onClick={onCancel}>
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

export function DealForm({
  initial,
  organizations,
  contacts,
  organizationId,
  lockOrganization,
  defaultStage,
  onCancel,
  onSaved,
}: {
  initial?: Deal | null
  organizations: Organization[]
  contacts: Contact[]
  organizationId?: number | null
  lockOrganization?: boolean
  defaultStage?: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(textOrEmpty(initial?.name))
  const [orgId, setOrgId] = useState(idText(initial?.organization_id, organizationId))
  const [contactId, setContactId] = useState(idText(initial?.contact_id))
  const [stage, setStage] = useState(dealStage(initial, defaultStage))
  const [value, setValue] = useState(dealValue(initial))
  const [probability, setProbability] = useState(dealProbability(initial))
  const [closeDate, setCloseDate] = useState(textOrEmpty(initial?.close_date))
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)
  const people = contactsAtOrg(contacts, orgId)
  const shownContactId = visibleContact(contacts, contactId, orgId)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const body: {
      name: string
      organization_id: number
      contact_id: number | null
      stage: string
      value: string
      close_date: string | null
      probability?: number
    } = {
      name,
      organization_id: Number(orgId),
      contact_id: shownContactId ? Number(shownContactId) : null,
      stage,
      value,
      close_date: closeDate || null,
    }
    const stageChanged = Boolean(initial) && stage !== initial?.stage
    if (!stageChanged && probability.trim() !== "") {
      const parsed = Number(probability)
      if (!Number.isInteger(parsed)) {
        setError({
          field: "probability",
          message: "Probability must be a whole number from 0 to 100",
        })
        setBusy(false)
        return
      }
      body.probability = parsed
    }
    try {
      if (initial) await api.updateDeal(initial.id, body)
      else await api.createDeal(body)
      onSaved()
    } catch (caught) {
      setError(takeError(caught))
      setBusy(false)
    }
  }

  return (
    <Dialog title={dialogTitle(Boolean(initial), "Edit deal", "Add deal")} onClose={onCancel}>
      <form onSubmit={onSubmit}>
        <Field label="Name" error={messageFor(error, "name")}>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Organization" error={messageFor(error, "organization_id")}>
          <select
            value={orgId}
            disabled={lockOrganization}
            onChange={(event) => setOrgId(event.target.value)}
          >
            <option value="">Choose an organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Main contact" error={messageFor(error, "contact_id")}>
          <select value={shownContactId} onChange={(event) => setContactId(event.target.value)}>
            <option value="">No main contact</option>
            {people.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stage" error={messageFor(error, "stage")}>
          <select value={stage} onChange={(event) => setStage(event.target.value)}>
            {STAGES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Value" error={messageFor(error, "value")}>
          <input
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
        <Field label="Probability" error={messageFor(error, "probability")}>
          <input
            inputMode="numeric"
            value={probability}
            placeholder={usualLabel(stage)}
            onChange={(event) => setProbability(event.target.value)}
          />
        </Field>
        <Field label="Close date" error={messageFor(error, "close_date")}>
          <input
            type="date"
            value={textOrEmpty(closeDate)}
            onChange={(event) => setCloseDate(event.target.value)}
          />
        </Field>
        {looseError(error)}
        <div className="actions">
          <button type="button" className="quiet" onClick={onCancel}>
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
