import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, test, vi } from "vitest"
import { contact, contactDetail, organization, today } from "../../test/fixtures"
import { ApiError, api } from "../../test/mockApi"
import { renderRoute } from "../../test/render"
import { ContactPage } from "./ContactPage"

vi.mock("../../lib/api", async () => {
  const mod = await import("../../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

beforeEach(() => {
  vi.clearAllMocks()
  api.contact.mockResolvedValue(contactDetail())
  api.organizations.mockResolvedValue({ today, items: [organization] })
  api.updateContact.mockResolvedValue(contact)
  api.deleteContact.mockResolvedValue(undefined)
})

test("a contact shows the organization and the deals", async () => {
  renderRoute("/contacts/2", "/contacts/:id", <ContactPage />)
  expect(await screen.findByRole("heading", { name: "Ada West" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Northwind" })).toBeTruthy()
  expect(screen.getAllByRole("link", { name: "Kitchen rollout" }).length).toBeGreaterThan(0)
  expect(screen.getByText("ada@northwind.example")).toBeTruthy()
  expect(screen.getByText("Buyer")).toBeTruthy()
})

test("a contact can have no organization and no deals", async () => {
  api.contact.mockResolvedValue(
    contactDetail({
      organization_id: null,
      organization_name: null,
      email: null,
      phone: null,
      job_title: null,
      deals: [],
      timeline: [],
    }),
  )
  renderRoute("/contacts/2", "/contacts/:id", <ContactPage />)
  expect(await screen.findByText("No organization")).toBeTruthy()
  expect(screen.getAllByText("There are no records yet.").length).toBeGreaterThan(0)
})

test("editing a contact saves and closes", async () => {
  const user = userEvent.setup()
  renderRoute("/contacts/2", "/contacts/:id", <ContactPage />)
  await screen.findByRole("heading", { name: "Ada West" })
  await user.click(screen.getAllByRole("button", { name: "Edit" })[0])
  expect(await screen.findByRole("heading", { name: "Edit contact" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateContact).toHaveBeenCalled()
  expect(screen.queryByRole("heading", { name: "Edit contact" })).toBeNull()
})

test("deleting a contact returns to the list", async () => {
  const user = userEvent.setup()
  renderRoute("/contacts/2", "/contacts/:id", <ContactPage />)
  await screen.findByRole("heading", { name: "Ada West" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }),
  )
  expect(await screen.findByRole("heading", { name: "Contacts home" })).toBeTruthy()
})

test("a failed contact delete stays on the page", async () => {
  api.deleteContact.mockRejectedValue(new Error("no"))
  const user = userEvent.setup()
  renderRoute("/contacts/2", "/contacts/:id", <ContactPage />)
  await screen.findByRole("heading", { name: "Ada West" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }),
  )
  expect(screen.getByRole("heading", { name: "Ada West" })).toBeTruthy()
})

test("a missing contact says the record is not here", async () => {
  api.contact.mockRejectedValue(new ApiError(404, "missing"))
  renderRoute("/contacts/9", "/contacts/:id", <ContactPage />)
  expect(await screen.findByText("This record is not here.")).toBeTruthy()
})

test("a failed contact load says so", async () => {
  api.contact.mockRejectedValue(new Error("down"))
  renderRoute("/contacts/2", "/contacts/:id", <ContactPage />)
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
})

test("a bad contact address says the record is not here", () => {
  renderRoute("/contacts/nope", "/contacts/:id", <ContactPage />)
  expect(screen.getByText("This record is not here.")).toBeTruthy()
  expect(api.contact).not.toHaveBeenCalled()
})
