import type { FollowUp } from "../crm/followups"

export class ApiError extends Error {
  status: number
  field?: string

  constructor(status: number, message: string, field?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.field = field
  }
}

export type Organization = {
  id: number
  name: string
  website: string | null
  industry: string | null
  notes: string | null
  added_by_name?: string | null
}

export type Contact = {
  id: number
  name: string
  email: string | null
  phone: string | null
  job_title: string | null
  organization_id: number | null
  organization_name: string | null
  status: string
  added_by_name?: string | null
}

export type Deal = {
  id: number
  name: string
  organization_id: number
  organization_name: string
  contact_id: number | null
  contact_name: string | null
  stage: string
  value_cents: number
  probability: number
  probability_hand_set: boolean
  close_date: string | null
  position: number
  late: boolean
  expected_cents: number
  added_by_name?: string | null
}

export type TimelineItem = {
  kind: "activity" | "stage"
  id: number
  happened_at: string
  title: string
  detail: string
  type?: string
  description?: string
  follow_up_date?: string | null
  done?: boolean
  contact_id?: number | null
  deal_id?: number | null
  record_type: string
  record_id: number
  record_name: string
  added_by_name?: string | null
}

export type OrganizationDetail = Organization & { contacts: Contact[]; deals: Deal[] }
export type ContactDetail = Contact & { deals: Deal[]; timeline: TimelineItem[]; today: string }
export type DealDetail = Deal & { timeline: TimelineItem[]; today: string }

export type List<T> = { today: string; items: T[] }

export type Task = FollowUp & {
  group: string
  record_type: string
  record_id: number
  record_name: string
}

export type MonthPoint = { key: string; label: string; cents: number; count: number }
export type OpenStage = {
  stage: string
  count: number
  value_cents: number
  expected_cents: number
}

export type Dashboard = {
  today: string
  open_pipeline_cents: number
  expected_cents: number
  won_this_month_cents: number
  won_this_month_count: number
  overdue_count: number
  months: MonthPoint[]
  open_stages: OpenStage[]
  tasks: Task[]
  recent: TimelineItem[]
}

export type DealBody = {
  name?: string
  organization_id?: number | null
  contact_id?: number | null
  stage?: string
  value?: string
  probability?: number
  close_date?: string | null
  position?: number
}

export type ActivityBody = {
  type?: string
  description?: string
  happened_at?: string
  follow_up_date?: string | null
  done?: boolean
  contact_id?: number | null
  deal_id?: number | null
}

type Query = { q?: string; sort?: string; dir?: string; status?: string }

export type PublicConfig = {
  supabase_url: string
  supabase_publishable_key: string
}

export type SessionUser = {
  token: string
  name: string
  email: string
}

export type SearchHit = {
  kind: "organization" | "contact" | "deal"
  id: number
  name: string
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export function apiBaseFor(host: string): string {
  if (host.startsWith("127.0.0.1") || host.startsWith("localhost")) return ""
  return "http://127.0.0.1:8000"
}

function apiUrl(path: string): string {
  if (path.startsWith("http")) return path
  const host = typeof location === "undefined" ? "" : location.host
  return `${apiBaseFor(host)}${path}`
}

function withAuth(options?: RequestInit): RequestInit {
  const headers = new Headers(options?.headers)
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`)
  return { ...options, headers }
}

type ErrorBody = { detail?: { field?: string; message?: string } | string }

function errorFor(status: number, body: ErrorBody | null): ApiError {
  const detail = body?.detail
  if (detail && typeof detail === "object") {
    return new ApiError(status, detail.message || "Check this field", detail.field)
  }
  return new ApiError(status, typeof detail === "string" ? detail : "Could not load records.")
}

async function payload<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    authToken = null
    onUnauthorized?.()
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  let body: ErrorBody | null = null
  if (text) {
    try {
      body = JSON.parse(text) as ErrorBody
    } catch {
      body = null
    }
  }
  if (!response.ok) throw errorFor(response.status, body)
  return body as T
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return await payload<T>(await fetch(apiUrl(path), withAuth(options)))
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error instanceof TypeError) {
        lastError = error
        await new Promise((resolve) => setTimeout(resolve, 250))
        continue
      }
      throw error
    }
  }
  throw lastError instanceof Error ? lastError : new ApiError(0, "Could not load records.")
}

function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const options: RequestInit = { method }
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" }
    options.body = JSON.stringify(body)
  }
  return request<T>(path, options)
}

function withQuery(path: string, params: Query): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const text = search.toString()
  return text ? `${path}?${text}` : path
}

export async function signInWithSupabase(
  url: string,
  key: string,
  email: string,
  password: string,
): Promise<SessionUser> {
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ email, password }),
  })
  const text = await response.text()
  const wrong = new ApiError(response.status, "Email or password is wrong", "password")
  if (!response.ok) throw wrong
  const body = JSON.parse(text) as {
    access_token?: string
    user?: { email?: string; user_metadata?: { full_name?: string; name?: string } }
  }
  if (!body.access_token) throw wrong
  const meta = body.user?.user_metadata ?? {}
  return {
    token: body.access_token,
    name: meta.full_name || meta.name || body.user?.email || email,
    email: body.user?.email || email,
  }
}

export const api = {
  config: () => request<PublicConfig>("/api/config"),
  signIn: (email: string, password: string) =>
    send<SessionUser>("/api/session", "POST", { email, password }),
  search: (q: string) => request<{ items: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  dashboard: () => request<Dashboard>("/api/dashboard"),
  organizations: (query: Query = {}) =>
    request<List<Organization>>(withQuery("/api/organizations", query)),
  organization: (id: number) => request<OrganizationDetail>(`/api/organizations/${id}`),
  createOrganization: (body: Partial<Organization>) =>
    send<Organization>("/api/organizations", "POST", body),
  updateOrganization: (id: number, body: Partial<Organization>) =>
    send<Organization>(`/api/organizations/${id}`, "PATCH", body),
  deleteOrganization: (id: number) => send<void>(`/api/organizations/${id}`, "DELETE"),
  contacts: (query: Query = {}) => request<List<Contact>>(withQuery("/api/contacts", query)),
  contact: (id: number) => request<ContactDetail>(`/api/contacts/${id}`),
  createContact: (body: Partial<Contact>) => send<ContactDetail>("/api/contacts", "POST", body),
  updateContact: (id: number, body: Partial<Contact>) =>
    send<ContactDetail>(`/api/contacts/${id}`, "PATCH", body),
  deleteContact: (id: number) => send<void>(`/api/contacts/${id}`, "DELETE"),
  deals: (query: Query = {}) => request<List<Deal>>(withQuery("/api/deals", query)),
  deal: (id: number) => request<DealDetail>(`/api/deals/${id}`),
  createDeal: (body: DealBody) => send<DealDetail>("/api/deals", "POST", body),
  updateDeal: (id: number, body: DealBody) => send<DealDetail>(`/api/deals/${id}`, "PATCH", body),
  deleteDeal: (id: number) => send<void>(`/api/deals/${id}`, "DELETE"),
  createActivity: (body: ActivityBody) => send<TimelineItem>("/api/activities", "POST", body),
  updateActivity: (id: number, body: ActivityBody) =>
    send<TimelineItem>(`/api/activities/${id}`, "PATCH", body),
  deleteActivity: (id: number) => send<void>(`/api/activities/${id}`, "DELETE"),
  deleteStageEntry: (id: number) => send<void>(`/api/stage-entries/${id}`, "DELETE"),
}
