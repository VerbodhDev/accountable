import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, test, vi } from "vitest"
import { contact, dealDetail, organization, today } from "../../test/fixtures"
import { ApiError, api } from "../../test/mockApi"
import { renderRoute } from "../../test/render"
import { DealPage } from "./DealPage"

vi.mock("../../lib/api", async () => {
  const mod = await import("../../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

beforeEach(() => {
  vi.clearAllMocks()
  api.deal.mockResolvedValue(dealDetail())
  api.organizations.mockResolvedValue({ today, items: [organization] })
  api.contacts.mockResolvedValue({ today, items: [contact] })
  api.updateDeal.mockResolvedValue(dealDetail())
  api.deleteDeal.mockResolvedValue(undefined)
})

test("a late deal shows the contact and the money", async () => {
  renderRoute("/deals/3", "/deals/:id", <DealPage />)
  expect(await screen.findByRole("heading", { name: "Kitchen rollout" })).toBeTruthy()
  expect(screen.getByText("Late")).toBeTruthy()
  expect(screen.getByRole("link", { name: "Ada West" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Northwind" })).toBeTruthy()
  expect(screen.getByText("$1,250.00")).toBeTruthy()
  expect(screen.getByText("Added by")).toBeTruthy()
  expect(screen.getByText("Alex Rivera")).toBeTruthy()
})

test("a deal can have no main contact and still be on time", async () => {
  api.deal.mockResolvedValue(
    dealDetail({
      contact_id: null,
      contact_name: null,
      stage: "Won",
      close_date: "2026-10-01",
      timeline: [],
    }),
  )
  renderRoute("/deals/3", "/deals/:id", <DealPage />)
  expect(await screen.findByText("No main contact")).toBeTruthy()
  expect(screen.queryByText("Late")).toBeNull()
})

test("editing a deal saves and closes", async () => {
  const user = userEvent.setup()
  renderRoute("/deals/3", "/deals/:id", <DealPage />)
  await screen.findByRole("heading", { name: "Kitchen rollout" })
  await user.click(screen.getAllByRole("button", { name: "Edit" })[0])
  expect(await screen.findByRole("heading", { name: "Edit deal" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateDeal).toHaveBeenCalled()
  expect(screen.queryByRole("heading", { name: "Edit deal" })).toBeNull()
})

test("deleting a deal returns to the list", async () => {
  const user = userEvent.setup()
  renderRoute("/deals/3", "/deals/:id", <DealPage />)
  await screen.findByRole("heading", { name: "Kitchen rollout" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }),
  )
  expect(await screen.findByRole("heading", { name: "Deals home" })).toBeTruthy()
})

test("a failed deal delete stays on the page", async () => {
  api.deleteDeal.mockRejectedValue(new Error("no"))
  const user = userEvent.setup()
  renderRoute("/deals/3", "/deals/:id", <DealPage />)
  await screen.findByRole("heading", { name: "Kitchen rollout" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }),
  )
  expect(screen.getByRole("heading", { name: "Kitchen rollout" })).toBeTruthy()
})

test("a missing deal says the record is not here", async () => {
  api.deal.mockRejectedValue(new ApiError(404, "missing"))
  renderRoute("/deals/9", "/deals/:id", <DealPage />)
  expect(await screen.findByText("This record is not here.")).toBeTruthy()
})

test("a failed deal load says so", async () => {
  api.deal.mockRejectedValue(new ApiError(500, "down"))
  renderRoute("/deals/3", "/deals/:id", <DealPage />)
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
})

test("a bad deal address says the record is not here", () => {
  renderRoute("/deals/nope", "/deals/:id", <DealPage />)
  expect(screen.getByText("This record is not here.")).toBeTruthy()
  expect(api.deal).not.toHaveBeenCalled()
})
