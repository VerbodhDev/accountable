import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, expect, test, vi } from "vitest"
import { api } from "../test/mockApi"
import { SearchBox } from "./SearchBox"

vi.mock("../lib/api", async () => {
  const mod = await import("../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

beforeEach(() => {
  vi.clearAllMocks()
})

function renderBox() {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<SearchBox />} />
        <Route path="/organizations/:id" element={<h1>Opened organization</h1>} />
        <Route path="/contacts/:id" element={<h1>Opened contact</h1>} />
        <Route path="/deals/:id" element={<h1>Opened deal</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

test("a result opens the record", async () => {
  api.search.mockResolvedValue({
    items: [{ kind: "organization", id: 4, name: "Lumen Clinic" }],
  })
  const user = userEvent.setup()
  renderBox()
  expect(screen.queryByText("There are no matches.")).toBeNull()
  await user.type(screen.getByLabelText("Search"), "lumen")
  const link = await screen.findByRole("link", { name: /Lumen Clinic/ })
  expect(screen.getByText("Organization")).toBeTruthy()
  await user.click(link)
  expect(await screen.findByRole("heading", { name: "Opened organization" })).toBeTruthy()
})

test("no matches says there are no matches", async () => {
  api.search.mockResolvedValue({ items: [] })
  const user = userEvent.setup()
  renderBox()
  await user.type(screen.getByLabelText("Search"), "zzz")
  expect(await screen.findByText("There are no matches.")).toBeTruthy()
})

test("an empty box shows nothing and does not search", () => {
  renderBox()
  expect(screen.queryByText("There are no matches.")).toBeNull()
  expect(api.search).not.toHaveBeenCalled()
})
