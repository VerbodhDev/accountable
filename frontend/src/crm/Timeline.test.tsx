import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import { activity, stageEntry } from "../test/fixtures"
import { ApiError, api } from "../test/mockApi"
import { Timeline } from "./Timeline"

vi.mock("../lib/api", async () => {
  const mod = await import("../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

function renderTimeline(
  items = [
    activity(),
    stageEntry(),
    activity({ id: 7, done: true, follow_up_date: null, description: "Done item" }),
  ],
  props: { contactId?: number; dealId?: number; stage?: string } = { contactId: 2 },
) {
  const onChange = vi.fn()
  render(
    <MemoryRouter>
      <Timeline items={items} parentName="Ada West" onChange={onChange} {...props} />
    </MemoryRouter>,
  )
  return { onChange }
}

beforeEach(() => {
  vi.clearAllMocks()
  api.createActivity.mockResolvedValue(activity())
  api.updateActivity.mockResolvedValue(activity())
  api.deleteActivity.mockResolvedValue(undefined)
  api.deleteStageEntry.mockResolvedValue(undefined)
})

test("an empty timeline says there are no records", () => {
  renderTimeline([])
  expect(screen.getByText("There are no records yet.")).toBeTruthy()
})

test("activities and stage entries show their own facts", () => {
  renderTimeline(
    [
      activity({ record_type: "deal", record_id: 3, record_name: "Kitchen rollout" }),
      stageEntry(),
      activity({ id: 7, done: true, follow_up_date: null, description: "Done item" }),
    ],
    { contactId: 2 },
  )
  expect(screen.getByText("Spoke about the kitchen")).toBeTruthy()
  expect(screen.getByText("Follow-up Nov 1")).toBeTruthy()
  expect(screen.getAllByRole("link", { name: "Kitchen rollout" }).length).toBeGreaterThan(0)
  expect(screen.getByText("Proposal")).toBeTruthy()
  expect(screen.getByText("Done")).toBeTruthy()
  expect(screen.getAllByRole("button", { name: "Mark done" })).toHaveLength(1)
})

test("logging an activity clears the form", async () => {
  const user = userEvent.setup()
  const { onChange } = renderTimeline([])
  await user.selectOptions(screen.getByLabelText("Type"), "Email")
  await user.type(screen.getByLabelText("Description"), "Sent the proposal")
  await user.type(screen.getByLabelText("Follow-up date"), "2026-11-20")
  await user.click(screen.getByRole("button", { name: "Log" }))
  expect(api.createActivity).toHaveBeenCalledWith({
    type: "Email",
    description: "Sent the proposal",
    follow_up_date: "2026-11-20",
    contact_id: 2,
    deal_id: null,
  })
  expect(screen.getByLabelText("Description")).toHaveProperty("value", "")
  expect(onChange).toHaveBeenCalledOnce()
})

test("a log error names the field", async () => {
  api.createActivity.mockRejectedValue(new ApiError(422, "Add a description", "description"))
  const user = userEvent.setup()
  renderTimeline([], { dealId: 3, stage: "Proposal" })
  await user.click(screen.getByRole("button", { name: "Log" }))
  expect(screen.getByText("Add a description")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Log" })).toHaveProperty("disabled", false)
})

test("a parent error is shown on the description", async () => {
  api.createActivity.mockRejectedValue(new ApiError(422, "Choose a record", "parent"))
  const user = userEvent.setup()
  renderTimeline([])
  await user.click(screen.getByRole("button", { name: "Log" }))
  expect(screen.getByText("Choose a record")).toBeTruthy()
})

test("a follow-up error stays on the date", async () => {
  api.createActivity.mockRejectedValue(new ApiError(422, "Use a real date", "follow_up_date"))
  const user = userEvent.setup()
  renderTimeline([])
  await user.click(screen.getByRole("button", { name: "Log" }))
  expect(screen.getByText("Use a real date")).toBeTruthy()
})

test("a log failure without a field stands alone", async () => {
  api.createActivity.mockRejectedValue(new Error("offline"))
  const user = userEvent.setup()
  renderTimeline([])
  await user.click(screen.getByRole("button", { name: "Log" }))
  expect(screen.getByText("Could not load records.")).toBeTruthy()
})

test("mark done saves the activity", async () => {
  const user = userEvent.setup()
  const { onChange } = renderTimeline([activity()])
  await user.click(screen.getByRole("button", { name: "Mark done" }))
  expect(api.updateActivity).toHaveBeenCalledWith(5, { done: true })
  expect(onChange).toHaveBeenCalledOnce()
})

test("editing an activity saves the new text", async () => {
  const user = userEvent.setup()
  const { onChange } = renderTimeline([
    activity({ type: undefined, description: "", follow_up_date: null }),
  ])
  await user.click(screen.getByRole("button", { name: "Edit" }))
  const dialog = screen.getByRole("dialog")
  expect(within(dialog).getByRole("heading", { name: "Edit activity" })).toBeTruthy()
  expect(within(dialog).getByLabelText("Type")).toHaveProperty("value", "Note")
  await user.type(within(dialog).getByLabelText("Description"), "Updated")
  await user.click(within(dialog).getByRole("button", { name: "Save" }))
  expect(api.updateActivity).toHaveBeenCalledWith(5, {
    type: "Note",
    description: "Updated",
    follow_up_date: null,
  })
  expect(onChange).toHaveBeenCalledOnce()
})

test("an edit error stays in the dialog", async () => {
  api.updateActivity.mockRejectedValue(new ApiError(422, "Add a description", "description"))
  const user = userEvent.setup()
  renderTimeline([activity()])
  await user.click(screen.getByRole("button", { name: "Edit" }))
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(screen.getByText("Add a description")).toBeTruthy()
})

test("an edit failure without a field stays in the dialog", async () => {
  api.updateActivity.mockRejectedValue(new Error("offline"))
  const user = userEvent.setup()
  renderTimeline([activity()])
  await user.click(screen.getByRole("button", { name: "Edit" }))
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }))
  expect(screen.getByRole("dialog")).toBeTruthy()
  expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" })).toHaveProperty(
    "disabled",
    false,
  )
})

test("cancel closes the activity editor", async () => {
  const user = userEvent.setup()
  renderTimeline([activity()])
  await user.click(screen.getByRole("button", { name: "Edit" }))
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(screen.queryByRole("heading", { name: "Edit activity" })).toBeNull()
})

test("deleting an activity asks, then removes it", async () => {
  const user = userEvent.setup()
  const { onChange } = renderTimeline([activity()], { dealId: 3, stage: "Proposal" })
  await user.click(screen.getByRole("button", { name: "Delete" }))
  expect(screen.getByText("Delete this activity? Ada West stays.")).toBeTruthy()
  await user.click(screen.getAllByRole("button", { name: "Delete" })[1])
  expect(api.deleteActivity).toHaveBeenCalledWith(5)
  expect(onChange).toHaveBeenCalledOnce()
})

test("deleting a stage entry uses the stage request", async () => {
  const user = userEvent.setup()
  renderTimeline([stageEntry()], { dealId: 3, stage: "Proposal" })
  await user.click(screen.getByRole("button", { name: "Delete" }))
  expect(
    screen.getByText("Delete this stage entry? Kitchen rollout stays in its current stage."),
  ).toBeTruthy()
  await user.click(screen.getAllByRole("button", { name: "Delete" })[1])
  expect(api.deleteStageEntry).toHaveBeenCalledWith(6)
})

test("a failed delete leaves the question open", async () => {
  api.deleteActivity.mockRejectedValue(new Error("no"))
  const user = userEvent.setup()
  renderTimeline([activity()])
  await user.click(screen.getByRole("button", { name: "Delete" }))
  await user.click(screen.getAllByRole("button", { name: "Delete" })[1])
  expect(await screen.findByText("Delete this activity? Ada West stays.")).toBeTruthy()
  expect(screen.getAllByRole("button", { name: "Delete" })[1]).toHaveProperty("disabled", false)
})

test("cancel closes the delete question", async () => {
  const user = userEvent.setup()
  renderTimeline([activity()])
  await user.click(screen.getByRole("button", { name: "Delete" }))
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(screen.queryByText("Delete this activity? Ada West stays.")).toBeNull()
})
