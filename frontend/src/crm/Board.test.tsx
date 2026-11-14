import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { DragEndEvent } from "@dnd-kit/core"
import type { ComponentProps } from "react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import { makeDeal, today } from "../test/fixtures"
import { api } from "../test/mockApi"
import { Board } from "./Board"

let onDragEnd: ((event: DragEndEvent) => void) | undefined

vi.mock("../lib/api", async () => {
  const mod = await import("../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core")
  return {
    ...actual,
    DndContext: (props: ComponentProps<typeof actual.DndContext>) => {
      onDragEnd = props.onDragEnd
      return <actual.DndContext {...props} />
    },
  }
})

function renderBoard(deals = [makeDeal()]) {
  const onReload = vi.fn(async () => undefined)
  const onAdd = vi.fn()
  const view = render(
    <MemoryRouter>
      <Board deals={deals} today={today} onReload={onReload} onAdd={onAdd} />
    </MemoryRouter>,
  )
  return { ...view, onReload, onAdd }
}

async function drop(active: number, over: string | null) {
  await act(async () => {
    onDragEnd?.({
      active: { id: active },
      over: over === null ? null : { id: over },
    } as DragEndEvent)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  onDragEnd = undefined
  api.updateDeal.mockResolvedValue(makeDeal())
})

test("the board totals open deals and marks a late card", async () => {
  const user = userEvent.setup()
  const { onAdd } = renderBoard([
    makeDeal({
      id: 1,
      name: "Open",
      stage: "New",
      value_cents: 10000,
      expected_cents: 1000,
      position: 0,
    }),
    makeDeal({
      id: 2,
      name: "Also open",
      stage: "New",
      value_cents: 10000,
      expected_cents: 1000,
      position: 0,
      close_date: "2026-12-01",
    }),
    makeDeal({
      id: 3,
      name: "Won deal",
      stage: "Won",
      value_cents: 50000,
      expected_cents: 50000,
      position: 1,
    }),
    makeDeal({
      id: 4,
      name: "Lost deal",
      stage: "Lost",
      value_cents: 40000,
      expected_cents: 0,
      position: 0,
    }),
  ])
  expect(screen.getByTestId("pipeline-open").textContent).toBe("$200.00")
  expect(screen.getByTestId("pipeline-expected").textContent).toBe("$20.00")
  expect(screen.getAllByText("Late").length).toBeGreaterThan(0)
  const names = [...screen.getByTestId("column-New").querySelectorAll("h3")].map(
    (node) => node.textContent,
  )
  expect(names[0]).toContain("Open")
  expect(names[1]).toContain("Also open")
  await user.click(screen.getAllByRole("button", { name: "Add deal" })[0])
  expect(onAdd).toHaveBeenCalledWith("New")
})

test("a new deal list replaces the cards on the board", () => {
  const { rerender } = renderBoard([makeDeal({ id: 1, name: "First" })])
  rerender(
    <MemoryRouter>
      <Board
        deals={[makeDeal({ id: 2, name: "Second", stage: "Qualified" })]}
        today={today}
        onReload={async () => undefined}
        onAdd={() => undefined}
      />
    </MemoryRouter>,
  )
  expect(screen.getByText("Second")).toBeTruthy()
  expect(screen.queryByText("First")).toBeNull()
})

test("a drop on the same card does nothing", async () => {
  renderBoard([makeDeal({ id: 1, stage: "New", position: 0 })])
  await drop(1, "1")
  expect(api.updateDeal).not.toHaveBeenCalled()
})

test("a drop with nowhere to land does nothing", async () => {
  renderBoard([makeDeal({ id: 1 })])
  await drop(1, null)
  await drop(99, "stage:Won")
  await drop(1, "stage:Nope")
  await drop(1, "999")
  expect(api.updateDeal).not.toHaveBeenCalled()
})

test("a drop on another column saves the stage and the position", async () => {
  const { onReload } = renderBoard([
    makeDeal({
      id: 1,
      name: "Moving",
      stage: "New",
      position: 0,
      value_cents: 10000,
      expected_cents: 1000,
    }),
    makeDeal({
      id: 8,
      name: "Old win",
      stage: "Won",
      position: 0,
      value_cents: 5000,
      expected_cents: 5000,
    }),
  ])
  await drop(1, "stage:Won")
  expect(api.updateDeal).toHaveBeenCalledWith(1, { stage: "Won", position: 1 })
  expect(screen.getByTestId("column-Won").textContent).toContain("Moving")
  expect(onReload).toHaveBeenCalled()
})

test("a drop on a card in another column uses that card's place", async () => {
  renderBoard([
    makeDeal({ id: 1, name: "Moving", stage: "New", position: 0 }),
    makeDeal({ id: 3, name: "Qualified card", stage: "Qualified", position: 0 }),
  ])
  await drop(1, "3")
  expect(api.updateDeal).toHaveBeenCalledWith(1, { stage: "Qualified", position: 0 })
})

test("a drop beside a card in the same column saves the new place", async () => {
  renderBoard([
    makeDeal({ id: 1, name: "Top", stage: "New", position: 0 }),
    makeDeal({ id: 2, name: "Bottom", stage: "New", position: 1, close_date: "2026-12-01" }),
  ])
  await drop(2, "1")
  expect(api.updateDeal).toHaveBeenCalledWith(2, { stage: "New", position: 0 })
})

test("a failed move puts the card back and says so", async () => {
  api.updateDeal.mockRejectedValue(new Error("no"))
  renderBoard([makeDeal({ id: 1, name: "Moving", stage: "New", position: 0 })])
  await drop(1, "stage:Won")
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Could not save the move.")
  expect(screen.getByTestId("column-New").textContent).toContain("Moving")
  expect(screen.getByTestId("column-Won").textContent).not.toContain("Moving")
})
