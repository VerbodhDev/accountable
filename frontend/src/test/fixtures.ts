import type {
  Contact,
  ContactDetail,
  Dashboard,
  Deal,
  DealDetail,
  Organization,
  OrganizationDetail,
  TimelineItem,
} from "../lib/api"

export const today = "2026-11-14"

export const organization: Organization = {
  id: 1,
  name: "Northwind",
  website: "northwind.example",
  industry: "Food",
  notes: "Key account",
}

export const contact: Contact = {
  id: 2,
  name: "Ada West",
  email: "ada@northwind.example",
  phone: "555-0100",
  job_title: "Buyer",
  organization_id: 1,
  organization_name: "Northwind",
  status: "Lead",
}

export function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 3,
    name: "Kitchen rollout",
    organization_id: 1,
    organization_name: "Northwind",
    contact_id: 2,
    contact_name: "Ada West",
    stage: "Proposal",
    value_cents: 125000,
    probability: 50,
    probability_hand_set: false,
    close_date: "2026-11-01",
    position: 0,
    late: true,
    expected_cents: 62500,
    ...overrides,
  }
}

export const deal = makeDeal()

export function activity(overrides: Partial<TimelineItem> = {}): TimelineItem {
  return {
    kind: "activity",
    id: 5,
    happened_at: "2026-11-10T00:00:00",
    title: "Call",
    detail: "Spoke",
    type: "Call",
    description: "Spoke about the kitchen",
    follow_up_date: "2026-11-01",
    done: false,
    contact_id: 2,
    deal_id: null,
    record_type: "contact",
    record_id: 2,
    record_name: "Ada West",
    ...overrides,
  }
}

export function stageEntry(overrides: Partial<TimelineItem> = {}): TimelineItem {
  return {
    kind: "stage",
    id: 6,
    happened_at: "2026-11-02T00:00:00",
    title: "Proposal",
    detail: "",
    record_type: "deal",
    record_id: 3,
    record_name: "Kitchen rollout",
    ...overrides,
  }
}

export function organizationDetail(
  overrides: Partial<OrganizationDetail> = {},
): OrganizationDetail {
  return { ...organization, contacts: [contact], deals: [deal], ...overrides }
}

export function contactDetail(overrides: Partial<ContactDetail> = {}): ContactDetail {
  return {
    ...contact,
    deals: [deal],
    timeline: [activity(), stageEntry()],
    today,
    ...overrides,
  }
}

export function dealDetail(overrides: Partial<DealDetail> = {}): DealDetail {
  return { ...deal, timeline: [activity(), stageEntry()], today, ...overrides }
}

export function task(
  overrides: Partial<Dashboard["tasks"][number]> = {},
): Dashboard["tasks"][number] {
  return {
    id: 5,
    description: "Call Ada",
    follow_up_date: "2026-11-01",
    done: false,
    group: "overdue",
    record_type: "contact",
    record_id: 2,
    record_name: "Ada West",
    ...overrides,
  }
}

export function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    today,
    open_pipeline_cents: 10000,
    expected_cents: 5000,
    won_this_month_cents: 2000,
    won_this_month_count: 1,
    overdue_count: 1,
    months: [{ key: "2026-11", label: "Nov", cents: 2000, count: 1 }],
    open_stages: [{ stage: "New", count: 1, value_cents: 10000, expected_cents: 1000 }],
    tasks: [],
    recent: [],
    ...overrides,
  }
}
