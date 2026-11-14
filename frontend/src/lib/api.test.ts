import { afterEach, expect, test, vi } from "vitest"
import { ApiError, api } from "./api"

type Seen = { url: string; method?: string; body?: string; json?: boolean }

function payload(status: number, body?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test("each call uses its path and method", async () => {
  const seen: Seen[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      const headers = options?.headers as Record<string, string> | undefined
      seen.push({
        url: String(url),
        method: options?.method,
        body: options?.body ? String(options.body) : undefined,
        json: headers?.["Content-Type"] === "application/json",
      })
      return payload(options?.method === "DELETE" ? 204 : 200, { id: 1 })
    }),
  )

  await api.dashboard()
  await api.organizations()
  await api.organizations({ q: "ada", sort: "name", dir: "asc", status: "" })
  await api.organization(4)
  await api.createOrganization({ name: "Northwind" })
  await api.updateOrganization(4, { name: "Eastwind" })
  await api.deleteOrganization(4)
  await api.contacts({ status: "lead" })
  await api.contact(2)
  await api.createContact({ name: "Ada" })
  await api.updateContact(2, { name: "Ada West" })
  await api.deleteContact(2)
  await api.deals({ q: "kit" })
  await api.deal(3)
  await api.createDeal({ name: "Kitchen", organization_id: 1 })
  await api.updateDeal(3, { stage: "Won", position: 1 })
  await api.deleteDeal(3)
  await api.createActivity({ type: "Call", description: "Spoke" })
  await api.updateActivity(5, { done: true })
  await api.deleteActivity(5)
  await api.deleteStageEntry(6)

  expect(seen.map((item) => item.url)).toEqual([
    "/api/dashboard",
    "/api/organizations",
    "/api/organizations?q=ada&sort=name&dir=asc",
    "/api/organizations/4",
    "/api/organizations",
    "/api/organizations/4",
    "/api/organizations/4",
    "/api/contacts?status=lead",
    "/api/contacts/2",
    "/api/contacts",
    "/api/contacts/2",
    "/api/contacts/2",
    "/api/deals?q=kit",
    "/api/deals/3",
    "/api/deals",
    "/api/deals/3",
    "/api/deals/3",
    "/api/activities",
    "/api/activities/5",
    "/api/activities/5",
    "/api/stage-entries/6",
  ])
  expect(seen[4]).toMatchObject({
    method: "POST",
    json: true,
    body: JSON.stringify({ name: "Northwind" }),
  })
  expect(seen[6]).toMatchObject({ method: "DELETE", json: false, body: undefined })
  expect(seen[0].method).toBeUndefined()
})

test("an empty or broken body does not become a record", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => payload(204)),
  )
  await expect(api.deleteDeal(3)).resolves.toBeUndefined()

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ status: 200, ok: true, text: async () => "" })),
  )
  await expect(api.dashboard()).resolves.toBeNull()

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ status: 200, ok: true, text: async () => "not-json" })),
  )
  await expect(api.dashboard()).resolves.toBeNull()
})

test("a field error keeps the field and the message", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => payload(422, { detail: { field: "name", message: "Name is required" } })),
  )
  await expect(api.createOrganization({})).rejects.toMatchObject({
    name: "ApiError",
    status: 422,
    field: "name",
    message: "Name is required",
  })

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => payload(422, { detail: { field: "value", message: "" } })),
  )
  await expect(api.createDeal({})).rejects.toMatchObject({
    message: "Check this field",
    field: "value",
  })

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => payload(404, { detail: "This record is not here." })),
  )
  const missing = api.deal(9)
  await expect(missing).rejects.toBeInstanceOf(ApiError)
  await expect(missing).rejects.toMatchObject({ status: 404, message: "This record is not here." })

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => payload(500, {})),
  )
  await expect(api.dashboard()).rejects.toMatchObject({ message: "Could not load records." })
})

test("a dropped connection is tried again", async () => {
  vi.useFakeTimers()
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce(payload(200, { today: "2026-11-14" }))
  vi.stubGlobal("fetch", fetchMock)
  const pending = api.dashboard()
  await vi.runAllTimersAsync()
  await expect(pending).resolves.toEqual({ today: "2026-11-14" })
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test("a connection that stays down gives up", async () => {
  vi.useFakeTimers()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("offline")
    }),
  )
  const pending = api.dashboard()
  const failed = expect(pending).rejects.toThrow(TypeError)
  await vi.runAllTimersAsync()
  await failed
})

test("a failure that is not a dropped connection stops at once", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("boom")
    }),
  )
  await expect(api.dashboard()).rejects.toThrow("boom")
})
