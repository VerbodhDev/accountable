import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import { organization, today } from "../../test/fixtures"
import { ApiError, api } from "../../test/mockApi"
import { OrganizationsPage } from "./OrganizationsPage"

vi.mock("../../lib/api", async () => {
  const mod = await import("../../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

const bare = {
  ...organization,
  id: 4,
  name: "Bare",
  website: null,
  industry: null,
  notes: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  api.organizations.mockImplementation(
    async (query?: { q?: string; sort?: string; dir?: string }) => {
      if (query?.q) return { today, items: [] }
      return { today, items: [organization, bare] }
    },
  )
  api.organization.mockResolvedValue({ ...organization, contacts: [], deals: [] })
  api.createOrganization.mockResolvedValue(organization)
  api.updateOrganization.mockResolvedValue(organization)
  api.deleteOrganization.mockResolvedValue(undefined)
})

function renderPage() {
  render(
    <MemoryRouter>
      <OrganizationsPage />
    </MemoryRouter>,
  )
}

test("organizations are listed, searched, and sorted", async () => {
  const user = userEvent.setup()
  renderPage()
  expect(await screen.findByRole("link", { name: "Northwind" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "northwind.example" }).getAttribute("href")).toBe(
    "https://northwind.example",
  )
  expect(screen.getByRole("link", { name: "Bare" })).toBeTruthy()
  await user.type(screen.getByLabelText("Search organizations"), "zzz")
  expect(await screen.findByText("There are no matches.")).toBeTruthy()
  await user.clear(screen.getByLabelText("Search organizations"))
  expect(await screen.findByRole("link", { name: "Northwind" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Name" }))
  expect(api.organizations).toHaveBeenCalledWith(
    expect.objectContaining({ sort: "name", dir: "desc" }),
  )
  await user.click(screen.getByRole("button", { name: "Industry" }))
  expect(api.organizations).toHaveBeenCalledWith(
    expect.objectContaining({ sort: "industry", dir: "asc" }),
  )
})

test("there are no organizations yet", async () => {
  api.organizations.mockResolvedValue({ today, items: [] })
  renderPage()
  expect(await screen.findByText("There are no records yet.")).toBeTruthy()
})

test("a failed organization list says so", async () => {
  api.organizations.mockRejectedValue(new Error("down"))
  renderPage()
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
  expect(screen.queryByText("Loading records.")).toBeNull()
})

test("a new organization can be saved", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Northwind" })
  await user.click(screen.getByRole("button", { name: "Add organization" }))
  await user.type(screen.getByLabelText("Name"), "Fabrikam")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.createOrganization).toHaveBeenCalledWith(expect.objectContaining({ name: "Fabrikam" }))
  expect(screen.queryByRole("heading", { name: "Add organization" })).toBeNull()
})

test("an organization can be edited", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Northwind" })
  await user.click(screen.getAllByRole("button", { name: "Edit" })[0])
  expect(screen.getByRole("heading", { name: "Edit organization" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateOrganization).toHaveBeenCalled()
})

test("an organization can be deleted", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Northwind" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  const dialog = await screen.findByRole("dialog")
  expect(within(dialog).getByText(/Delete Northwind/)).toBeTruthy()
  await user.click(within(dialog).getByRole("button", { name: "Delete" }))
  expect(api.deleteOrganization).toHaveBeenCalledWith(1)
  expect(screen.queryByRole("dialog")).toBeNull()
})

test("a failed delete leaves the question open", async () => {
  api.deleteOrganization.mockRejectedValue(new Error("no"))
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Northwind" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  const dialog = await screen.findByRole("dialog")
  await user.click(within(dialog).getByRole("button", { name: "Delete" }))
  expect(await screen.findByRole("dialog")).toBeTruthy()
  expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" })).toHaveProperty(
    "disabled",
    false,
  )
})

test("a missing organization does not open a delete question", async () => {
  api.organization
    .mockRejectedValueOnce(new Error("no"))
    .mockRejectedValueOnce(new ApiError(500, "down"))
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Northwind" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  expect(screen.queryByRole("dialog")).toBeNull()
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
})
