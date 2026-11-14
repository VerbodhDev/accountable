import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { ApiError, api, type Organization, type OrganizationDetail } from "../../lib/api"
import { websiteHref } from "../../lib/format"
import { DataTable, type Sort } from "../DataTable"
import { ConfirmDialog } from "../Dialog"
import { organizationDeleteText } from "../deleteText"
import { OrganizationForm } from "../Forms"
import { LoadError, PageHeading } from "../../shell/Shell"

export function OrganizationsPage() {
  const [rows, setRows] = useState<Organization[]>([])
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<Sort>({ id: "name", dir: "asc" })
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Organization | null>(null)
  const [removing, setRemoving] = useState<OrganizationDetail | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    return api
      .organizations({ q, sort: sort.id, dir: sort.dir })
      .then((data) => {
        setError(false)
        setRows(data.items)
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

  async function askDelete(org: Organization) {
    try {
      setRemoving(await api.organization(org.id))
    } catch (caught) {
      if (caught instanceof ApiError) setError(true)
    }
  }

  const columns = useMemo<ColumnDef<Organization, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link to={`/organizations/${row.original.id}`}>{row.original.name}</Link>
        ),
      },
      { id: "industry", header: "Industry", accessorKey: "industry" },
      {
        id: "website",
        header: "Website",
        accessorKey: "website",
        cell: ({ getValue }) => {
          const value = getValue<string | null>()
          if (!value) return ""
          return (
            <a href={websiteHref(value)} target="_blank" rel="noreferrer">
              {value}
            </a>
          )
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="actions">
            <button type="button" className="quiet" onClick={() => setEditing(row.original)}>
              Edit
            </button>
            <button type="button" className="quiet" onClick={() => void askDelete(row.original)}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <PageHeading title="Organizations">
        <button type="button" className="primary" onClick={() => setAdding(true)}>
          Add organization
        </button>
      </PageHeading>
      <div className="toolbar">
        <input
          aria-label="Search organizations"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>
      {error ? <LoadError /> : null}
      {loaded ? (
        <DataTable
          rows={rows}
          columns={columns}
          sort={sort}
          onSort={onSort}
          sortable={["name", "industry", "website"]}
          empty={q.trim() ? "There are no matches." : "There are no records yet."}
        />
      ) : error ? null : (
        <p>Loading records.</p>
      )}
      {adding ? (
        <OrganizationForm
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            void load()
          }}
        />
      ) : null}
      {editing ? (
        <OrganizationForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void load()
          }}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Delete organization"
          body={organizationDeleteText(removing)}
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            setBusy(true)
            void api
              .deleteOrganization(removing.id)
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
