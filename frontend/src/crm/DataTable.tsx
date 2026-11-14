import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"

export type Sort = { id: string; dir: "asc" | "desc" }

export function DataTable<T>({
  rows,
  columns,
  sort,
  onSort,
  sortable,
  empty,
}: {
  rows: T[]
  columns: ColumnDef<T, unknown>[]
  sort: Sort
  onSort: (id: string) => void
  sortable: string[]
  empty: string
}) {
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting: [{ id: sort.id, desc: sort.dir === "desc" }] },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const id = header.column.id
                const canSort = sortable.includes(id)
                const ariaSort =
                  id === sort.id ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                return (
                  <th key={header.id} aria-sort={canSort ? ariaSort : undefined}>
                    {canSort ? (
                      <button type="button" onClick={() => onSort(id)}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
