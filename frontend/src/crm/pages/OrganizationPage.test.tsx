import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, test, vi } from "vitest"
import { contact, deal, organization, organizationDetail } from "../../test/fixtures"
import { ApiError, api } from "../../test/mockApi"
import { renderRoute } from "../../test/render"
import { OrganizationPage } from "./OrganizationPage"

vi.mock("../../lib/api", async () => {
  const mod = await import("../../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

beforeEach(() => {
  vi.clearAllMocks()
  api.organization.mockResolvedValue(organizationDetail())
  api.updateOrganization.mockResolvedValue(organization)
  api.createContact.mockResolvedValue(contact)
  api.createDeal.mockResolvedValue(deal)
  api.deleteOrganization.mockResolvedValue(undefined)
})

test("an organization shows its people and deals", async () => {
  renderRoute("/organizations/1", "/organizations/:id", <OrganizationPage />)
  expect(await screen.findByRole("heading", { name: "Northwind" })).toBeTruthy()
  expect(screen.getByText("Key account")).toBeTruthy()
  expect(screen.getByRole("link", { name: "northwind.example" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Ada West" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Kitchen rollout" })).toBeTruthy()
  expect(screen.getByText("Lead")).toBeTruthy()
  expect(screen.getByText("Added by")).toBeTruthy()
  expect(screen.getByText("Alex Rivera")).toBeTruthy()
})

test("an organization can omit notes, the website, people, and deals", async () => {
  api.organization.mockResolvedValue(
    organizationDetail({
      website: null,
      notes: null,
      contacts: [],
      deals: [],
      added_by_name: null,
    }),
  )
  renderRoute("/organizations/1", "/organizations/:id", <OrganizationPage />)
  expect(await screen.findByRole("heading", { name: "Northwind" })).toBeTruthy()
  expect(screen.getAllByText("There are no records yet.")).toHaveLength(2)
  expect(screen.queryByText("Key account")).toBeNull()
  expect(screen.queryByText("Added by")).toBeNull()
})

test("edit, add contact, and add deal save from the organization", async () => {
  const user = userEvent.setup()
  renderRoute("/organizations/1", "/organizations/:id", <OrganizationPage />)
  await screen.findByRole("heading", { name: "Northwind" })
  await user.click(screen.getByRole("button", { name: "Edit" }))
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateOrganization).toHaveBeenCalled()
  await user.click(screen.getByRole("button", { name: "Add contact" }))
  expect(screen.getByLabelText("Organization")).toHaveProperty("disabled", true)
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  await user.click(screen.getByRole("button", { name: "Add deal" }))
  expect(screen.getByRole("heading", { name: "Add deal" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(screen.queryByRole("heading", { name: "Add deal" })).toBeNull()
})

test("deleting an organization returns to the list", async () => {
  const user = userEvent.setup()
  renderRoute("/organizations/1", "/organizations/:id", <OrganizationPage />)
  await screen.findByRole("heading", { name: "Northwind" })
  await user.click(screen.getByRole("button", { name: "Delete" }))
  const dialog = await screen.findByRole("dialog")
  await user.click(within(dialog).getByRole("button", { name: "Delete" }))
  expect(await screen.findByRole("heading", { name: "Organizations home" })).toBeTruthy()
})

test("a failed organization delete stays on the page", async () => {
  api.deleteOrganization.mockRejectedValue(new Error("no"))
  const user = userEvent.setup()
  renderRoute("/organizations/1", "/organizations/:id", <OrganizationPage />)
  await screen.findByRole("heading", { name: "Northwind" })
  await user.click(screen.getByRole("button", { name: "Delete" }))
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }),
  )
  expect(await screen.findByRole("dialog")).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Northwind" })).toBeTruthy()
})

test("a missing organization says the record is not here", async () => {
  api.organization.mockRejectedValue(new ApiError(404, "missing"))
  renderRoute("/organizations/9", "/organizations/:id", <OrganizationPage />)
  expect(await screen.findByText("This record is not here.")).toBeTruthy()
})

test("a failed organization load says so", async () => {
  api.organization.mockRejectedValue(new ApiError(500, "down"))
  renderRoute("/organizations/1", "/organizations/:id", <OrganizationPage />)
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
})

test("a bad organization address says the record is not here", () => {
  renderRoute("/organizations/nope", "/organizations/:id", <OrganizationPage />)
  expect(screen.getByText("This record is not here.")).toBeTruthy()
  expect(api.organization).not.toHaveBeenCalled()
})
