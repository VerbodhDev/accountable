import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import { activity, dashboard, stageEntry, task } from "../../test/fixtures"
import { ApiError, api } from "../../test/mockApi"
import { DashboardPage } from "./DashboardPage"

vi.mock("../../lib/api", async () => {
  const mod = await import("../../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

const loaded = dashboard({
  tasks: [
    task(),
    task({
      id: 9,
      description: "Send the proposal",
      follow_up_date: "2026-11-20",
      record_type: "deal",
      record_id: 3,
      record_name: "Kitchen rollout",
    }),
  ],
  recent: [activity({ detail: "extra detail" }), stageEntry()],
})

beforeEach(() => {
  vi.clearAllMocks()
  api.dashboard.mockResolvedValue(loaded)
  api.updateActivity.mockResolvedValue(activity())
})

function renderPage() {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

test("the dashboard shows the numbers, the recent work, and the follow-ups", async () => {
  renderPage()
  expect(await screen.findByText("$100.00")).toBeTruthy()
  expect(screen.getByText("Revenue won")).toBeTruthy()
  expect(screen.getByText("extra detail")).toBeTruthy()
  expect(screen.getByText("Added by Alex Rivera")).toBeTruthy()
  expect(screen.getAllByRole("link", { name: "Kitchen rollout" }).length).toBeGreaterThan(0)
  expect(screen.getByText("Call Ada")).toBeTruthy()
  expect(screen.getByText("Send the proposal")).toBeTruthy()
  expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0)
})

test("an empty dashboard says there is nothing to follow up", async () => {
  api.dashboard.mockResolvedValue(dashboard())
  renderPage()
  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy()
  expect(screen.getAllByText("There are no records yet.")).toHaveLength(2)
})

test("mark done reloads the follow-ups", async () => {
  api.dashboard.mockResolvedValueOnce(loaded).mockResolvedValueOnce(dashboard())
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("Call Ada")
  await user.click(screen.getAllByRole("button", { name: "Mark done" })[0])
  expect(api.updateActivity).toHaveBeenCalledWith(5, { done: true })
  expect(await screen.findAllByText("There are no records yet.")).toHaveLength(2)
})

test("a failed mark done says the records could not load", async () => {
  api.updateActivity.mockRejectedValue(new ApiError(500, "down"))
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("Call Ada")
  await user.click(screen.getAllByRole("button", { name: "Mark done" })[0])
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
})

test("a mark done failure that is not from the api leaves the page", async () => {
  api.updateActivity.mockRejectedValue(new Error("offline"))
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("Call Ada")
  await user.click(screen.getAllByRole("button", { name: "Mark done" })[0])
  expect(screen.queryByText("Could not load records.")).toBeNull()
  expect(screen.getByText("Call Ada")).toBeTruthy()
})

test("a failed dashboard says so", async () => {
  api.dashboard.mockRejectedValue(new Error("down"))
  renderPage()
  expect(await screen.findByText("Could not load records.")).toBeTruthy()
  expect(screen.queryByText("Loading records.")).toBeNull()
})

test("the dashboard says it is loading until the records arrive", async () => {
  let release: (value: ReturnType<typeof dashboard>) => void = () => undefined
  api.dashboard.mockReturnValue(
    new Promise((resolve) => {
      release = resolve
    }),
  )
  renderPage()
  expect(screen.getByText("Loading records.")).toBeTruthy()
  release(dashboard())
  expect(await screen.findByRole("heading", { name: "Follow-ups" })).toBeTruthy()
})
