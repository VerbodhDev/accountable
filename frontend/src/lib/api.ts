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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(path, options)
      if (response.status === 204) return undefined as T
      const text = await response.text()
      let body: { detail?: { field?: string; message?: string } | string } | null = null
      if (text) {
        try {
          body = JSON.parse(text) as { detail?: { field?: string; message?: string } | string }
        } catch {
          body = null
        }
      }
      if (!response.ok) {
        const detail = body?.detail
        if (detail && typeof detail === "object") {
          throw new ApiError(response.status, detail.message || "Check this field", detail.field)
        }
        throw new ApiError(
          response.status,
          typeof detail === "string" ? detail : "Could not load records.",
        )
      }
      return body as T
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

export const api = {
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
