import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ColumnDef } from "@tanstack/react-table"
import { expect, test, vi } from "vitest"
import { DataTable, type Sort } from "./DataTable"

type Row = { name: string; note: string }

const columns: ColumnDef<Row, unknown>[] = [
  { id: "name", header: "Name", accessorKey: "name" },
  { id: "note", header: "Note", accessorKey: "note" },
]

test("an empty table says what is missing", () => {
  render(
    <DataTable
      rows={[]}
      columns={columns}
      sort={{ id: "name", dir: "asc" }}
      onSort={() => undefined}
      sortable={["name"]}
      empty="There are no records yet."
    />,
  )
  expect(screen.getByText("There are no records yet.")).toBeTruthy()
  expect(screen.queryByRole("button", { name: "Note" })).toBeNull()
})

test("a sortable heading reports its direction and asks to sort", async () => {
  const onSort = vi.fn()
  const user = userEvent.setup()
  const view = render(
    <DataTable
      rows={[{ name: "Northwind", note: "Food" }]}
      columns={columns}
      sort={{ id: "name", dir: "asc" }}
      onSort={onSort}
      sortable={["name"]}
      empty="There are no records yet."
    />,
  )
  expect(screen.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort")).toBe(
    "ascending",
  )
  expect(screen.getByText("Northwind")).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Name" }))
  expect(onSort).toHaveBeenCalledWith("name")
  const desc: Sort = { id: "note", dir: "desc" }
  view.rerender(
    <DataTable
      rows={[{ name: "Northwind", note: "Food" }]}
      columns={columns}
      sort={desc}
      onSort={onSort}
      sortable={["name", "note"]}
      empty="There are no records yet."
    />,
  )
  expect(screen.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort")).toBe("none")
  expect(screen.getByRole("columnheader", { name: "Note" }).getAttribute("aria-sort")).toBe(
    "descending",
  )
})
