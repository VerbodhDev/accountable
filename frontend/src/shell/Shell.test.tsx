import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../test/mockApi"
import { LoadError, Missing, PageHeading, Shell } from "./Shell"
import { SessionProvider } from "./session"

vi.mock("../lib/api", async () => {
  const real = await vi.importActual<typeof import("../lib/api")>("../lib/api")
  const mod = await import("../test/mockApi")
  return { ...real, api: mod.api, ApiError: mod.ApiError }
})

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.unstubAllGlobals()
})

function renderShell() {
  localStorage.setItem(
    "accountable-session",
    JSON.stringify({
      token: "local.token",
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
    }),
  )
  render(
    <SessionProvider>
      <MemoryRouter initialEntries={["/contacts"]}>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route path="contacts" element={<p>Inside contacts</p>} />
            <Route index element={<p>Inside</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

test("the shell shows the product name and the current page", () => {
  renderShell()
  expect(screen.getByText("Accountable")).toBeTruthy()
  expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Organizations" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Contacts" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Deals" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Pipeline" })).toBeTruthy()
  expect(screen.getByText("Inside contacts")).toBeTruthy()
  expect(screen.getByLabelText("Search")).toBeTruthy()
})

test("the menu shows the initials and the four labels", async () => {
  const user = userEvent.setup()
  renderShell()
  expect(screen.queryByRole("button", { name: "Dark mode" })).toBeNull()
  await user.click(screen.getByRole("button", { name: "AR" }))
  expect(screen.getByRole("button", { name: "Light" })).toHaveProperty("ariaPressed", "true")
  expect(screen.getByRole("button", { name: "Dark" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "System" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Dark" }))
  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(screen.getByRole("button", { name: "Dark" })).toHaveProperty("ariaPressed", "true")
  await user.click(screen.getByRole("button", { name: "Light" }))
  expect(document.documentElement.dataset.theme).toBe("light")
})

test("system follows the device", async () => {
  const media = { dark: true, notify: null as (() => void) | null }
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return media.dark && query.includes("dark")
    },
    media: query,
    addEventListener: (_event: string, fn: () => void) => {
      media.notify = fn
    },
    removeEventListener: () => {
      media.notify = null
    },
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }))
  const user = userEvent.setup()
  renderShell()
  await user.click(screen.getByRole("button", { name: "AR" }))
  await user.click(screen.getByRole("button", { name: "System" }))
  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(localStorage.getItem("accountable-theme")).toBe("system")
  media.dark = false
  media.notify?.()
  expect(document.documentElement.dataset.theme).toBe("light")
})

test("sign out removes the stored session", async () => {
  const user = userEvent.setup()
  renderShell()
  await user.click(screen.getByRole("button", { name: "AR" }))
  await user.click(screen.getByRole("button", { name: "Sign out" }))
  expect(localStorage.getItem("accountable-session")).toBeNull()
  expect(api.search).not.toHaveBeenCalled()
})

test("a page heading can carry actions", () => {
  render(<PageHeading title="Contacts" />)
  expect(screen.getByRole("heading", { name: "Contacts" })).toBeTruthy()
  render(
    <PageHeading title="Deals">
      <button type="button">Add deal</button>
    </PageHeading>,
  )
  expect(screen.getByRole("button", { name: "Add deal" })).toBeTruthy()
})

test("missing and failed loads say so", () => {
  render(
    <>
      <Missing />
      <LoadError />
    </>,
  )
  expect(screen.getByText("This record is not here.")).toBeTruthy()
  expect(screen.getByText("Could not load records.")).toBeTruthy()
})
