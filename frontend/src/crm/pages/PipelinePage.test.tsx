import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import { contact, makeDeal, organization, today } from "../../test/fixtures"
import { api } from "../../test/mockApi"
import { PipelinePage } from "./PipelinePage"

vi.mock("../../lib/api", async () => {
  const mod = await import("../../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

beforeEach(() => {
  vi.clearAllMocks()
  api.deals.mockResolvedValue({ today, items: [makeDeal({ stage: "New", name: "Board deal" })] })
  api.organizations.mockResolvedValue({ today, items: [organization] })
  api.contacts.mockResolvedValue({ today, items: [contact] })
  api.createDeal.mockResolvedValue(makeDeal())
})

test("the pipeline shows the board and can add a deal", async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <PipelinePage />
    </MemoryRouter>,
  )
  expect(await screen.findByText("Board deal")).toBeTruthy()
  await user.click(screen.getAllByRole("button", { name: "Add deal" })[1])
  expect(await screen.findByRole("heading", { name: "Add deal" })).toBeTruthy()
  expect(screen.getByLabelText("Stage")).toHaveProperty("value", "Qualified")
  await user.selectOptions(screen.getByLabelText("Organization"), "1")
  await user.type(screen.getByLabelText("Name"), "Added")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.createDeal).toHaveBeenCalled()
  expect(screen.queryByRole("heading", { name: "Add deal" })).toBeNull()
})

test("a failed pipeline load says so", async () => {
  api.deals.mockRejectedValue(new Error("down"))
  render(
    <MemoryRouter>
      <PipelinePage />
    </MemoryRouter>,
  )
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
  expect(screen.queryByText("Loading records.")).toBeNull()
})
