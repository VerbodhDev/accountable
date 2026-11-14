import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, test, vi } from "vitest"
import { setAuthToken } from "../lib/api"
import { dashboard } from "../test/fixtures"
import { App } from "../main"

beforeEach(() => {
  localStorage.clear()
  setAuthToken(null)
  vi.unstubAllGlobals()
})

function stubFetch(handler: (url: string) => { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const result = handler(String(input))
      return {
        status: result.status,
        ok: result.status >= 200 && result.status < 300,
        text: async () => JSON.stringify(result.body),
      }
    }),
  )
}

test("a wrong password stays on the sign-in screen", async () => {
  stubFetch((url) => {
    if (url.includes("/api/session")) {
      return {
        status: 422,
        body: { detail: { field: "password", message: "Email or password is wrong" } },
      }
    }
    return { status: 200, body: { supabase_url: "", supabase_publishable_key: "" } }
  })
  const user = userEvent.setup()
  render(<App />)
  await screen.findByLabelText("Email")
  expect(screen.queryByRole("link", { name: /account/i })).toBeNull()
  await user.type(screen.getByLabelText("Email"), "alex.rivera@example.com")
  await user.type(screen.getByLabelText("Password"), "nope")
  await user.click(screen.getByRole("button", { name: "Sign in" }))
  expect(await screen.findByText("Email or password is wrong")).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy()
})

test("Alex Rivera reaches the dashboard", async () => {
  stubFetch((url) => {
    if (url.includes("/api/session")) {
      return {
        status: 200,
        body: {
          token: "local.token",
          name: "Alex Rivera",
          email: "alex.rivera@example.com",
        },
      }
    }
    if (url.includes("/api/dashboard")) return { status: 200, body: dashboard() }
    return { status: 200, body: { supabase_url: "", supabase_publishable_key: "" } }
  })
  const user = userEvent.setup()
  render(<App />)
  await user.type(await screen.findByLabelText("Email"), "alex.rivera@example.com")
  await user.type(screen.getByLabelText("Password"), "local-only")
  await user.click(screen.getByRole("button", { name: "Sign in" }))
  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy()
})

test("a shared backend signs in with Supabase", async () => {
  stubFetch((url) => {
    if (url.includes("/auth/v1/token")) {
      return {
        status: 200,
        body: {
          access_token: "supabase-token",
          user: { email: "casey@example.com", user_metadata: { name: "Casey Quinn" } },
        },
      }
    }
    if (url.includes("/api/dashboard")) return { status: 200, body: dashboard() }
    return {
      status: 200,
      body: {
        supabase_url: "https://example.supabase.co",
        supabase_publishable_key: "sb_publishable_test",
      },
    }
  })
  const user = userEvent.setup()
  render(<App />)
  await user.type(await screen.findByLabelText("Email"), "casey@example.com")
  await user.type(screen.getByLabelText("Password"), "secret")
  await user.click(screen.getByRole("button", { name: "Sign in" }))
  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy()
  const fetchMock = vi.mocked(fetch)
  expect(String(fetchMock.mock.calls.map((call) => call[0]))).toContain(
    "https://example.supabase.co/auth/v1/token?grant_type=password",
  )
})
