import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import { contact, dealDetail, makeDeal, organization, today } from "../../test/fixtures"
import { api } from "../../test/mockApi"
import { DealsPage } from "./DealsPage"

vi.mock("../../lib/api", async () => {
  const mod = await import("../../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

const openDeal = makeDeal({ stage: "New", close_date: "2026-12-01", name: "Future deal" })
const unlinked = makeDeal({
  id: 4,
  name: "No contact",
  contact_id: null,
  contact_name: null,
  stage: "Won",
  close_date: "2026-10-01",
})

beforeEach(() => {
  vi.clearAllMocks()
  api.deals.mockImplementation(async (query?: { q?: string }) => {
    if (query?.q) return { today, items: [] }
    return { today, items: [makeDeal(), openDeal, unlinked] }
  })
  api.organizations.mockResolvedValue({ today, items: [organization] })
  api.contacts.mockResolvedValue({ today, items: [contact] })
  api.deal.mockResolvedValue(dealDetail())
  api.createDeal.mockResolvedValue(dealDetail())
  api.updateDeal.mockResolvedValue(dealDetail())
  api.deleteDeal.mockResolvedValue(undefined)
})

function renderPage() {
  render(
    <MemoryRouter>
      <DealsPage />
    </MemoryRouter>,
  )
}

test("deals show the late mark, the contact, and an empty contact", async () => {
  const user = userEvent.setup()
  renderPage()
  expect(await screen.findByRole("link", { name: "Kitchen rollout" })).toBeTruthy()
  expect(screen.getAllByText("Late").length).toBeGreaterThan(1)
  expect(screen.getAllByRole("link", { name: "Ada West" }).length).toBeGreaterThan(0)
  expect(screen.getByRole("link", { name: "No contact" })).toBeTruthy()
  await user.type(screen.getByLabelText("Search deals"), "zzz")
  expect(await screen.findByText("There are no matches.")).toBeTruthy()
  await user.clear(screen.getByLabelText("Search deals"))
  await screen.findByRole("link", { name: "Kitchen rollout" })
  await user.click(screen.getByRole("button", { name: "Close date" }))
  expect(api.deals).toHaveBeenCalledWith(
    expect.objectContaining({ sort: "close_date", dir: "desc" }),
  )
  await user.click(screen.getByRole("button", { name: "Value" }))
  expect(api.deals).toHaveBeenCalledWith(expect.objectContaining({ sort: "value", dir: "asc" }))
})

test("there are no deals yet", async () => {
  api.deals.mockResolvedValue({ today, items: [] })
  renderPage()
  expect(await screen.findByText("There are no records yet.")).toBeTruthy()
})

test("a failed deal list says so", async () => {
  api.deals.mockRejectedValue(new Error("down"))
  renderPage()
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
})

test("a deal can be added and edited", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Kitchen rollout" })
  await user.click(screen.getByRole("button", { name: "Add deal" }))
  expect(await screen.findByRole("heading", { name: "Add deal" })).toBeTruthy()
  await user.selectOptions(screen.getByLabelText("Organization"), "1")
  await user.type(screen.getByLabelText("Name"), "New deal")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.createDeal).toHaveBeenCalled()
  await user.click(screen.getAllByRole("button", { name: "Edit" })[0])
  expect(await screen.findByRole("heading", { name: "Edit deal" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateDeal).toHaveBeenCalled()
})

test("a deal can be deleted", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Kitchen rollout" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  const dialog = await screen.findByRole("dialog")
  expect(within(dialog).getByText(/Delete Kitchen rollout/)).toBeTruthy()
  await user.click(within(dialog).getByRole("button", { name: "Delete" }))
  expect(api.deleteDeal).toHaveBeenCalledWith(3)
})

test("a failed deal delete leaves the question open", async () => {
  api.deleteDeal.mockRejectedValue(new Error("no"))
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole("link", { name: "Kitchen rollout" })
  await user.click(screen.getAllByRole("button", { name: "Delete" })[0])
  const dialog = await screen.findByRole("dialog")
  await user.click(within(dialog).getByRole("button", { name: "Delete" }))
  expect(await screen.findByRole("dialog")).toBeTruthy()
})
