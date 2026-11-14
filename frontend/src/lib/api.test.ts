import { afterEach, expect, test, vi } from "vitest"
import { api, apiBaseFor, setAuthToken, setUnauthorizedHandler, signInWithSupabase } from "./api"

function call(fetchMock: { mock: { calls: unknown[][] } }, index: number): [string, RequestInit?] {
  const sent = fetchMock.mock.calls[index]
  if (!sent) throw new Error("The request was not sent")
  return sent as [string, RequestInit?]
}

afterEach(() => {
  setAuthToken(null)
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

test("the api base stays on this computer except for the local site", () => {
  expect(apiBaseFor("127.0.0.1:5173")).toBe("")
  expect(apiBaseFor("localhost:5173")).toBe("")
  expect(apiBaseFor("bucket.s3.amazonaws.com")).toBe("http://127.0.0.1:8000")
})

test("a request sends the bearer token and keeps the content type", async () => {
  const fetchMock = vi.fn(async () => ({
    status: 200,
    ok: true,
    text: async () =>
      JSON.stringify({ token: "issued", name: "Alex Rivera", email: "a@example.com" }),
  }))
  vi.stubGlobal("fetch", fetchMock)
  setAuthToken("abc")
  await api.signIn("a@example.com", "local-only")
  const sent = call(fetchMock, 0)
  const headers = new Headers(sent[1]?.headers)
  expect(headers.get("Authorization")).toBe("Bearer abc")
  expect(headers.get("Content-Type")).toBe("application/json")
})

test("a 401 clears the token and tells the session", async () => {
  const handler = vi.fn()
  setUnauthorizedHandler(handler)
  setAuthToken("abc")
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    if (headers.get("Authorization")) {
      return { status: 401, ok: false, text: async () => JSON.stringify({ detail: "Sign in" }) }
    }
    return {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ supabase_url: "", supabase_publishable_key: "" }),
    }
  })
  vi.stubGlobal("fetch", fetchMock)
  await expect(api.dashboard()).rejects.toThrow("Sign in")
  expect(handler).toHaveBeenCalledOnce()
  await api.config()
  const sent = call(fetchMock, 1)
  const headers = new Headers(sent[1]?.headers)
  expect(headers.get("Authorization")).toBeNull()
})

test("supabase sign-in reads the token from the auth response", async () => {
  const fetchMock = vi.fn(async () => ({
    status: 200,
    ok: true,
    text: async () =>
      JSON.stringify({
        access_token: "supabase-token",
        user: { email: "casey@example.com", user_metadata: { full_name: "Casey Quinn" } },
      }),
  }))
  vi.stubGlobal("fetch", fetchMock)
  const user = await signInWithSupabase(
    "https://example.supabase.co/",
    "sb_publishable_test",
    "casey@example.com",
    "secret",
  )
  expect(user).toEqual({
    token: "supabase-token",
    name: "Casey Quinn",
    email: "casey@example.com",
  })
  const sent = call(fetchMock, 0)
  expect(sent[0]).toBe("https://example.supabase.co/auth/v1/token?grant_type=password")
  const headers = new Headers(sent[1]?.headers)
  expect(headers.get("apikey")).toBe("sb_publishable_test")
})

test("a rejected supabase password stays a field error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ status: 400, ok: false, text: async () => "{}" })),
  )
  await expect(
    signInWithSupabase("https://example.supabase.co", "key", "a@example.com", "nope"),
  ).rejects.toMatchObject({ field: "password" })
})
