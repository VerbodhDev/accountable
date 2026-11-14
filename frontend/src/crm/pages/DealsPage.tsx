import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { api, type Contact, type Deal, type DealDetail, type Organization } from "../../lib/api"
import { shortDate } from "../../lib/format"
import { money } from "../../lib/money"
import { DataTable, type Sort } from "../DataTable"
import { ConfirmDialog } from "../Dialog"
import { dealDeleteText } from "../deleteText"
import { DealForm } from "../Forms"
import { isLate, markStyle } from "../late"
import { STAGE_COLOR, stageInk } from "../stages"
import { LoadError, PageHeading } from "../../shell/Shell"

export function DealsPage() {
  const [rows, setRows] = useState<Deal[]>([])
  const [today, setToday] = useState("")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<Sort>({ id: "close_date", dir: "asc" })
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Deal | null>(null)
  const [removing, setRemoving] = useState<DealDetail | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return api
      .deals({ q, sort: sort.id, dir: sort.dir })
      .then((data) => {
        setError(false)
        setRows(data.items)
        setToday(data.today)
        setLoaded(true)
      })
      .catch(() => setError(true))
  }, [q, sort])

  useEffect(() => {
    void load()
  }, [load])

  function onSort(id: string) {
    setSort((current) =>
      current.id === id ? { id, dir: current.dir === "asc" ? "desc" : "asc" } : { id, dir: "asc" },
    )
  }

  async function openForm(deal: Deal | null) {
    const [orgs, people] = await Promise.all([api.organizations(), api.contacts()])
    setOrganizations(orgs.items)
    setContacts(people.items)
    if (deal) setEditing(deal)
    else setAdding(true)
  }

  const columns = useMemo<ColumnDef<Deal, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => <Link to={`/deals/${row.original.id}`}>{row.original.name}</Link>,
      },
      {
        id: "organization",
        header: "Organization",
        accessorKey: "organization_name",
        cell: ({ row }) => (
          <Link to={`/organizations/${row.original.organization_id}`}>
            {row.original.organization_name}
          </Link>
        ),
      },
      {
        id: "contact",
        header: "Main contact",
        accessorKey: "contact_name",
        cell: ({ row }) =>
          row.original.contact_id ? (
            <Link to={`/contacts/${row.original.contact_id}`}>{row.original.contact_name}</Link>
          ) : (
            ""
          ),
      },
      {
        id: "stage",
        header: "Stage",
        accessorKey: "stage",
        cell: ({ getValue }) => {
          const stage = getValue<string>()
          return (
            <span
              className="chip"
              style={{ background: STAGE_COLOR[stage], color: stageInk(stage) }}
            >
              {stage}
            </span>
          )
        },
      },
      {
        id: "value",
        header: "Value",
        accessorKey: "value_cents",
        cell: ({ getValue }) => <span className="mono">{money(getValue<number>())}</span>,
      },
      {
        id: "probability",
        header: "Probability",
        accessorKey: "probability",
        cell: ({ getValue }) => <span className="mono">{getValue<number>()}</span>,
      },
      {
        id: "close_date",
        header: "Close date",
        accessorKey: "close_date",
        cell: ({ getValue }) => (
          <span className="mono">{shortDate(getValue<string | null>())}</span>
        ),
      },
      {
        id: "late",
        header: "Late",
        cell: ({ row }) =>
          isLate(row.original.stage, row.original.close_date, today) ? (
            <span className="pill" style={markStyle("Late")}>
              Late
            </span>
          ) : null,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="actions">
            <button type="button" className="quiet" onClick={() => void openForm(row.original)}>
              Edit
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => void api.deal(row.original.id).then(setRemoving)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [today],
  )

  return (
    <>
      <PageHeading title="Deals">
        <button type="button" className="primary" onClick={() => void openForm(null)}>
          Add deal
        </button>
      </PageHeading>
      <div className="toolbar">
        <input aria-label="Search deals" value={q} onChange={(event) => setQ(event.target.value)} />
      </div>
      {error ? <LoadError /> : null}
      {loaded ? (
        <DataTable
          rows={rows}
          columns={columns}
          sort={sort}
          onSort={onSort}
          sortable={[
            "name",
            "organization",
            "contact",
            "stage",
            "value",
            "probability",
            "close_date",
          ]}
          empty={q.trim() ? "There are no matches." : "There are no records yet."}
        />
      ) : error ? null : (
        <p>Loading records.</p>
      )}
      {adding ? (
        <DealForm
          organizations={organizations}
          contacts={contacts}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            void load()
          }}
        />
      ) : null}
      {editing ? (
        <DealForm
          initial={editing}
          organizations={organizations}
          contacts={contacts}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void load()
          }}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Delete deal"
          body={dealDeleteText(removing)}
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            setBusy(true)
            void api
              .deleteDeal(removing.id)
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
