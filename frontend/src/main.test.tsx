import { render, screen } from "@testing-library/react"
import { beforeEach, expect, test, vi } from "vitest"
import { dashboard } from "./test/fixtures"
import { setAuthToken } from "./lib/api"
import { App } from "./main"

beforeEach(() => {
  localStorage.clear()
  setAuthToken(null)
})

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes("/api/config")
        ? { supabase_url: "", supabase_publishable_key: "" }
        : dashboard()
      return { status: 200, ok: true, text: async () => JSON.stringify(body) }
    }),
  )
}

test("signed out, every page is the sign-in screen", async () => {
  stubFetch()
  render(<App />)
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeTruthy()
  expect(screen.queryByRole("link", { name: "Organizations" })).toBeNull()
})

test("a stored session opens the dashboard", async () => {
  localStorage.setItem(
    "accountable-session",
    JSON.stringify({
      token: "local.token",
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
    }),
  )
  stubFetch()
  render(<App />)
  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy()
  expect(screen.getByText("Accountable")).toBeTruthy()
})
