import { vi } from "vitest"

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

export const api = {
  dashboard: vi.fn(),
  organizations: vi.fn(),
  organization: vi.fn(),
  createOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  contacts: vi.fn(),
  contact: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  deals: vi.fn(),
  deal: vi.fn(),
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
  deleteDeal: vi.fn(),
  createActivity: vi.fn(),
  updateActivity: vi.fn(),
  deleteActivity: vi.fn(),
  deleteStageEntry: vi.fn(),
}
