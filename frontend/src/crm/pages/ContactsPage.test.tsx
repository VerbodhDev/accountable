import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import { contact, contactDetail, organization, today } from "../../test/fixtures"
import { api } from "../../test/mockApi"
import { ContactsPage } from "./ContactsPage"

vi.mock("../../lib/api", async () => {
  const mod = await import("../../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

const bare = {
  ...contact,
  id: 4,
  name: "No org",
  email: null,
  phone: null,
  job_title: null,
  organization_id: null,
  organization_name: null,
  status: "Customer",
}

beforeEach(() => {
  vi.clearAllMocks()
  api.contacts.mockImplementation(async (query?: { q?: string; status?: string; dir?: string }) => {
    if (query?.q) return { today, items: [] }
    return { today, items: [contact, bare] }
  })
  api.organizations.mockResolvedValue({ today, items: [organization] })
  api.contact.mockResolvedValue(contactDetail())
  api.createContact.mockResolvedValue(contact)
  api.updateContact.mockResolvedValue(contact)
  api.deleteContact.mockResolvedValue(undefined)
})

function renderPage() {
  render(
    <MemoryRouter>
      <ContactsPage />
    </MemoryRouter>,
  )
}

test("contacts can be filtered, searched, and sorted", async () => {
  const user = userEvent.setup()
  renderPage()
  expect(await screen.findByRole("link", { name: "Ada West" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Northwind" })).toBeTruthy()
  expect(screen.getAllByText("Customer").length).toBeGreaterThan(0)
  await user.click(screen.getByRole("button", { name: "Qualified" }))
  expect(api.contacts).toHaveBeenCalledWith(expect.objectContaining({ status: "qualified" }))
  await user.type(screen.getByLabelText("Search contacts"), "zzz")
  expect(await screen.findByText("There are no matches.")).toBeTruthy()
  await user.clear(screen.getByLabelText("Search contacts"))
  await screen.findByRole("link", { name: "Ada West" })
  await user.click(screen.getByRole("button", { name: "Name" }))
  expect(api.contacts).toHaveBeenCalledWith(expect.objectContaining({ sort: "name", dir: "desc" }))
})

test("there are no contacts yet", async () => {
  api.contacts.mockResolvedValue({ today, items: [] })
  renderPage()
  expect(await screen.findByText("There are no records yet.")).toBeTruthy()
})

test("a failed contact list says so", async () => {
  api.contacts.mockRejectedValue(new Error("down"))
  renderPage()
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
})

test("a contact can be added and edited", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Ada West" })
  await user.click(screen.getByRole("button", { name: "Add contact" }))
  expect(await screen.findByRole("heading", { name: "Add contact" })).toBeTruthy()
  await user.type(screen.getByLabelText("Name"), "Bea")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.createContact).toHaveBeenCalled()
  await user.click(screen.getAllByRole("button", { name: "Edit" })[0])
  expect(await screen.findByRole("heading", { name: "Edit contact" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateContact).toHaveBeenCalled()
})

test("a contact can be deleted", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Ada West" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  const dialog = await screen.findByRole("dialog")
  expect(within(dialog).getByText(/Delete Ada West/)).toBeTruthy()
  await user.click(within(dialog).getByRole("button", { name: "Delete" }))
  expect(api.deleteContact).toHaveBeenCalledWith(2)
})

test("a failed contact delete leaves the question open", async () => {
  api.deleteContact.mockRejectedValue(new Error("no"))
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Ada West" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  const dialog = await screen.findByRole("dialog")
  await user.click(within(dialog).getByRole("button", { name: "Delete" }))
  expect(await screen.findByRole("dialog")).toBeTruthy()
})
