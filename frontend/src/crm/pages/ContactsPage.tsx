import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { api, type Contact, type ContactDetail, type Organization } from "../../lib/api"
import { DataTable, type Sort } from "../DataTable"
import { ConfirmDialog } from "../Dialog"
import { contactDeleteText } from "../deleteText"
import { ContactForm } from "../Forms"
import { markStyle, type MarkName } from "../late"
import { LoadError, PageHeading } from "../../shell/Shell"

const FILTERS = ["All", "Lead", "Qualified", "Customer"]

export function ContactsPage() {
  const [rows, setRows] = useState<Contact[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("All")
  const [sort, setSort] = useState<Sort>({ id: "name", dir: "asc" })
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [removing, setRemoving] = useState<ContactDetail | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return api
      .contacts({
        q,
        sort: sort.id,
        dir: sort.dir,
        status: status === "All" ? "" : status.toLowerCase(),
      })
      .then((data) => {
        setError(false)
        setRows(data.items)
        setLoaded(true)
      })
      .catch(() => setError(true))
  }, [q, sort, status])

  useEffect(() => {
    void load()
  }, [load])

  function onSort(id: string) {
    setSort((current) =>
      current.id === id ? { id, dir: current.dir === "asc" ? "desc" : "asc" } : { id, dir: "asc" },
    )
  }

  const loadOrganizations = useCallback(async () => {
    const data = await api.organizations()
    setOrganizations(data.items)
  }, [])

  const openAdd = useCallback(async () => {
    await loadOrganizations()
    setAdding(true)
  }, [loadOrganizations])

  const openEdit = useCallback(
    async (contact: Contact) => {
      await loadOrganizations()
      setEditing(contact)
    },
    [loadOrganizations],
  )

  const askDelete = useCallback(async (contact: Contact) => {
    setRemoving(await api.contact(contact.id))
  }, [])

  const columns = useMemo<ColumnDef<Contact, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => <Link to={`/contacts/${row.original.id}`}>{row.original.name}</Link>,
      },
      { id: "email", header: "Email", accessorKey: "email" },
      { id: "phone", header: "Phone", accessorKey: "phone" },
      { id: "job_title", header: "Job title", accessorKey: "job_title" },
      {
        id: "organization",
        header: "Organization",
        accessorKey: "organization_name",
        cell: ({ row }) =>
          row.original.organization_id ? (
            <Link to={`/organizations/${row.original.organization_id}`}>
              {row.original.organization_name}
            </Link>
          ) : (
            ""
          ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => {
          const value = getValue<string>()
          return (
            <span className="chip" style={markStyle(value as MarkName)}>
              {value}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="actions">
            <button type="button" className="quiet" onClick={() => void openEdit(row.original)}>
              Edit
            </button>
            <button type="button" className="quiet" onClick={() => void askDelete(row.original)}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    [openEdit, askDelete],
  )

  return (
    <>
      <PageHeading title="Contacts">
        <button type="button" className="primary" onClick={() => void openAdd()}>
          Add contact
        </button>
      </PageHeading>
      <div className="toolbar">
        <input
          aria-label="Search contacts"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <div className="filters" role="group" aria-label="Status">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={status === item}
              onClick={() => setStatus(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {error ? <LoadError /> : null}
      {loaded ? (
        <DataTable
          rows={rows}
          columns={columns}
          sort={sort}
          onSort={onSort}
          sortable={["name", "email", "phone", "job_title", "organization", "status"]}
          empty={q.trim() ? "There are no matches." : "There are no records yet."}
        />
      ) : error ? null : (
        <p>Loading records.</p>
      )}
      {adding ? (
        <ContactForm
          organizations={organizations}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            void load()
          }}
        />
      ) : null}
      {editing ? (
        <ContactForm
          initial={editing}
          organizations={organizations}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void load()
          }}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Delete contact"
          body={contactDeleteText(removing)}
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            setBusy(true)
            void api
              .deleteContact(removing.id)
              .then(() => {
                setRemoving(null)
                setBusy(false)
                void load()
              })
              .catch(() => setBusy(false))
          }}
        />
      ) : null}
    </>
  )
}
