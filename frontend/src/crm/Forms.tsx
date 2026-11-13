import { useEffect, useState, type FormEvent } from "react"
import { ApiError, api, type Contact, type Deal, type Organization } from "../lib/api"
import { dollarInput } from "../lib/money"
import { Dialog, Field } from "./Dialog"
import { STAGES, USUAL_PROBABILITY } from "./stages"

type FieldError = { field: string; message: string }

function takeError(error: unknown): FieldError {
  if (error instanceof ApiError) return { field: error.field || "", message: error.message }
  return { field: "", message: "Could not load records." }
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
  const [name, setName] = useState(initial?.name ?? "")
  const [website, setWebsite] = useState(initial?.website ?? "")
  const [industry, setIndustry] = useState(initial?.industry ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
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
    <Dialog title={initial ? "Edit organization" : "Add organization"} onClose={onCancel}>
      <form onSubmit={onSubmit}>
        <Field label="Name" error={error?.field === "name" ? error.message : undefined}>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Website" error={error?.field === "website" ? error.message : undefined}>
          <input value={website} onChange={(event) => setWebsite(event.target.value)} />
        </Field>
        <Field label="Industry" error={error?.field === "industry" ? error.message : undefined}>
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} />
        </Field>
        <Field label="Notes" error={error?.field === "notes" ? error.message : undefined}>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        {error && !error.field ? <p className="field-error">{error.message}</p> : null}
        <div className="actions">
          <button type="button" className="quiet" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>Save</button>
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
  const [name, setName] = useState(initial?.name ?? "")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [jobTitle, setJobTitle] = useState(initial?.job_title ?? "")
  const [orgId, setOrgId] = useState(String(initial?.organization_id ?? organizationId ?? ""))
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
    <Dialog title={initial ? "Edit contact" : "Add contact"} onClose={onCancel}>
      <form onSubmit={onSubmit}>
        <Field label="Name" error={error?.field === "name" ? error.message : undefined}>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email" error={error?.field === "email" ? error.message : undefined}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Phone" error={error?.field === "phone" ? error.message : undefined}>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Job title" error={error?.field === "job_title" ? error.message : undefined}>
          <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
        </Field>
        <Field label="Organization" error={error?.field === "organization_id" ? error.message : undefined}>
          <select value={orgId} disabled={lockOrganization} onChange={(event) => setOrgId(event.target.value)}>
            <option value="">No organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Status" error={error?.field === "status" ? error.message : undefined}>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>Lead</option>
            <option>Qualified</option>
            <option>Customer</option>
          </select>
        </Field>
        {error && !error.field ? <p className="field-error">{error.message}</p> : null}
        <div className="actions">
          <button type="button" className="quiet" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>Save</button>
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
  const [name, setName] = useState(initial?.name ?? "")
  const [orgId, setOrgId] = useState(String(initial?.organization_id ?? organizationId ?? ""))
  const [contactId, setContactId] = useState(String(initial?.contact_id ?? ""))
  const [stage, setStage] = useState(initial?.stage ?? defaultStage ?? "New")
  const [value, setValue] = useState(initial ? dollarInput(initial.value_cents) : "")
  const [probability, setProbability] = useState(initial?.probability_hand_set ? String(initial.probability) : "")
  const [closeDate, setCloseDate] = useState(initial?.close_date ?? "")
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)
  const people = contacts.filter((contact) => String(contact.organization_id ?? "") === orgId)

  useEffect(() => {
    if (!contactId) return
    const match = contacts.find((contact) => String(contact.id) === contactId)
    if (!match || String(match.organization_id ?? "") !== orgId) setContactId("")
  }, [orgId, contactId, contacts])

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
      contact_id: contactId ? Number(contactId) : null,
      stage,
      value,
      close_date: closeDate || null,
    }
    const stageChanged = Boolean(initial) && stage !== initial?.stage
    if (!stageChanged && probability.trim() !== "") {
      const parsed = Number(probability)
      if (!Number.isInteger(parsed)) {
        setError({ field: "probability", message: "Probability must be a whole number from 0 to 100" })
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
    <Dialog title={initial ? "Edit deal" : "Add deal"} onClose={onCancel}>
      <form onSubmit={onSubmit}>
        <Field label="Name" error={error?.field === "name" ? error.message : undefined}>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Organization" error={error?.field === "organization_id" ? error.message : undefined}>
          <select value={orgId} disabled={lockOrganization} onChange={(event) => setOrgId(event.target.value)}>
            <option value="">Choose an organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Main contact" error={error?.field === "contact_id" ? error.message : undefined}>
          <select value={contactId} onChange={(event) => setContactId(event.target.value)}>
            <option value="">No main contact</option>
            {people.map((contact) => (
              <option key={contact.id} value={contact.id}>{contact.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Stage" error={error?.field === "stage" ? error.message : undefined}>
          <select value={stage} onChange={(event) => setStage(event.target.value)}>
            {STAGES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Value" error={error?.field === "value" ? error.message : undefined}>
          <input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
        </Field>
        <Field label="Probability" error={error?.field === "probability" ? error.message : undefined}>
          <input
            inputMode="numeric"
            value={probability}
            placeholder={`Usual is ${USUAL_PROBABILITY[stage] ?? ""}`}
            onChange={(event) => setProbability(event.target.value)}
          />
        </Field>
        <Field label="Close date" error={error?.field === "close_date" ? error.message : undefined}>
          <input type="date" value={closeDate || ""} onChange={(event) => setCloseDate(event.target.value)} />
        </Field>
        {error && !error.field ? <p className="field-error">{error.message}</p> : null}
        <div className="actions">
          <button type="button" className="quiet" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>Save</button>
        </div>
      </form>
    </Dialog>
  )
}
