import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, test, vi } from "vitest"
import { contact, deal, organization } from "../test/fixtures"
import { ApiError, api } from "../test/mockApi"
import { ContactForm, DealForm, OrganizationForm } from "./Forms"

vi.mock("../lib/api", async () => {
  const mod = await import("../test/mockApi")
  return { api: mod.api, ApiError: mod.ApiError }
})

const fabrikam = {
  ...organization,
  id: 9,
  name: "Fabrikam",
  website: null,
  industry: null,
  notes: null,
}
const bea = {
  ...contact,
  id: 9,
  name: "Bea North",
  organization_id: 9,
  organization_name: "Fabrikam",
}

beforeEach(() => {
  vi.clearAllMocks()
  api.createOrganization.mockResolvedValue(organization)
  api.updateOrganization.mockResolvedValue(organization)
  api.createContact.mockResolvedValue(contact)
  api.updateContact.mockResolvedValue(contact)
  api.createDeal.mockResolvedValue(deal)
  api.updateDeal.mockResolvedValue(deal)
})

test("a new organization is saved", async () => {
  const onSaved = vi.fn()
  const user = userEvent.setup()
  render(<OrganizationForm onCancel={() => undefined} onSaved={onSaved} />)
  expect(screen.getByRole("heading", { name: "Add organization" })).toBeTruthy()
  await user.type(screen.getByLabelText("Name"), "Northwind")
  await user.type(screen.getByLabelText("Website"), "northwind.example")
  await user.type(screen.getByLabelText("Industry"), "Food")
  await user.type(screen.getByLabelText("Notes"), "Key account")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.createOrganization).toHaveBeenCalledWith({
    name: "Northwind",
    website: "northwind.example",
    industry: "Food",
    notes: "Key account",
  })
  expect(onSaved).toHaveBeenCalledOnce()
})

test("an organization edit keeps the current values", async () => {
  const onSaved = vi.fn()
  const user = userEvent.setup()
  render(<OrganizationForm initial={organization} onCancel={() => undefined} onSaved={onSaved} />)
  expect(screen.getByRole("heading", { name: "Edit organization" })).toBeTruthy()
  expect(screen.getByLabelText("Name")).toHaveProperty("value", "Northwind")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateOrganization).toHaveBeenCalledWith(1, {
    name: "Northwind",
    website: "northwind.example",
    industry: "Food",
    notes: "Key account",
  })
  expect(onSaved).toHaveBeenCalledOnce()
})

test("an organization field error stays on that field", async () => {
  api.createOrganization.mockRejectedValue(new ApiError(422, "Name is required", "name"))
  const user = userEvent.setup()
  render(<OrganizationForm onCancel={() => undefined} onSaved={() => undefined} />)
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(screen.getByText("Name is required")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Save" })).toHaveProperty("disabled", false)
})

test("an organization error without a field stands alone", async () => {
  api.createOrganization.mockRejectedValue(new ApiError(500, "Could not load records."))
  const user = userEvent.setup()
  render(<OrganizationForm onCancel={() => undefined} onSaved={() => undefined} />)
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(screen.getByText("Could not load records.")).toBeTruthy()
})

test("cancel closes the organization form", async () => {
  const onCancel = vi.fn()
  const user = userEvent.setup()
  render(<OrganizationForm onCancel={onCancel} onSaved={() => undefined} />)
  await user.click(screen.getByRole("button", { name: "Close" }))
  expect(onCancel).toHaveBeenCalledOnce()
})

test("a new contact starts as a lead and can omit the organization", async () => {
  const user = userEvent.setup()
  render(
    <ContactForm
      organizations={[organization, fabrikam]}
      onCancel={() => undefined}
      onSaved={() => undefined}
    />,
  )
  expect(screen.getByLabelText("Status")).toHaveProperty("value", "Lead")
  await user.type(screen.getByLabelText("Name"), "Ada West")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.createContact).toHaveBeenCalledWith({
    name: "Ada West",
    email: "",
    phone: "",
    job_title: "",
    organization_id: null,
    status: "Lead",
  })
})

test("a contact edit sends the chosen organization", async () => {
  const user = userEvent.setup()
  render(
    <ContactForm
      initial={contact}
      organizations={[organization]}
      onCancel={() => undefined}
      onSaved={() => undefined}
    />,
  )
  expect(screen.getByRole("heading", { name: "Edit contact" })).toBeTruthy()
  await user.selectOptions(screen.getByLabelText("Status"), "Customer")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateContact).toHaveBeenCalledWith(
    2,
    expect.objectContaining({ organization_id: 1, status: "Customer" }),
  )
})

test("a locked organization cannot be changed on a contact", () => {
  render(
    <ContactForm
      organizations={[organization]}
      organizationId={1}
      lockOrganization
      onCancel={() => undefined}
      onSaved={() => undefined}
    />,
  )
  expect(screen.getByLabelText("Organization")).toHaveProperty("disabled", true)
  expect(screen.getByLabelText("Organization")).toHaveProperty("value", "1")
})

test("a contact save shows a field error", async () => {
  api.createContact.mockRejectedValue(new Error("offline"))
  const user = userEvent.setup()
  render(<ContactForm organizations={[]} onCancel={() => undefined} onSaved={() => undefined} />)
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(screen.getByText("Could not load records.")).toBeTruthy()
})

test("a new deal sends the usual stage and no probability until one is typed", async () => {
  const user = userEvent.setup()
  render(
    <DealForm
      organizations={[organization]}
      contacts={[contact, bea]}
      defaultStage="Qualified"
      onCancel={() => undefined}
      onSaved={() => undefined}
    />,
  )
  expect(screen.getByLabelText("Stage")).toHaveProperty("value", "Qualified")
  expect(screen.getByLabelText("Probability")).toHaveProperty("placeholder", "Usual is 30")
  expect(screen.queryByRole("option", { name: "Bea North" })).toBeNull()
  await user.selectOptions(screen.getByLabelText("Organization"), "1")
  await user.selectOptions(screen.getByLabelText("Main contact"), "2")
  await user.type(screen.getByLabelText("Name"), "Kitchen rollout")
  await user.type(screen.getByLabelText("Value"), "1250.00")
  await user.type(screen.getByLabelText("Probability"), "40")
  await user.type(screen.getByLabelText("Close date"), "2026-12-01")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.createDeal).toHaveBeenCalledWith({
    name: "Kitchen rollout",
    organization_id: 1,
    contact_id: 2,
    stage: "Qualified",
    value: "1250.00",
    close_date: "2026-12-01",
    probability: 40,
  })
})

test("a deal drops a contact that does not belong to the organization", async () => {
  const user = userEvent.setup()
  render(
    <DealForm
      initial={deal}
      organizations={[organization, fabrikam]}
      contacts={[contact, bea]}
      onCancel={() => undefined}
      onSaved={() => undefined}
    />,
  )
  expect(screen.getByLabelText("Main contact")).toHaveProperty("value", "2")
  await user.selectOptions(screen.getByLabelText("Organization"), "9")
  expect(screen.getByLabelText("Main contact")).toHaveProperty("value", "")
  expect(screen.getByRole("option", { name: "Bea North" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(api.updateDeal).toHaveBeenCalledWith(
    3,
    expect.objectContaining({ organization_id: 9, contact_id: null, stage: "Proposal" }),
  )
})

test("a stage change does not send the old probability", async () => {
  const user = userEvent.setup()
  render(
    <DealForm
      initial={{ ...deal, probability_hand_set: true }}
      organizations={[organization]}
      contacts={[contact]}
      onCancel={() => undefined}
      onSaved={() => undefined}
    />,
  )
  expect(screen.getByLabelText("Probability")).toHaveProperty("value", "50")
  await user.selectOptions(screen.getByLabelText("Stage"), "Negotiation")
  await user.click(screen.getByRole("button", { name: "Save" }))
  const body = api.updateDeal.mock.calls[0][1] as { probability?: number; stage: string }
  expect(body.stage).toBe("Negotiation")
  expect(body.probability).toBeUndefined()
})

test("a deal probability must be a whole number", async () => {
  const user = userEvent.setup()
  render(
    <DealForm
      organizations={[organization]}
      contacts={[]}
      onCancel={() => undefined}
      onSaved={() => undefined}
    />,
  )
  await user.type(screen.getByLabelText("Probability"), "1.5")
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(screen.getByText("Probability must be a whole number from 0 to 100")).toBeTruthy()
  expect(api.createDeal).not.toHaveBeenCalled()
  expect(screen.getByRole("button", { name: "Save" })).toHaveProperty("disabled", false)
})

test("a deal save shows the returned field error", async () => {
  api.createDeal.mockRejectedValue(new ApiError(422, "Organization is required", "organization_id"))
  const user = userEvent.setup()
  render(
    <DealForm
      organizations={[organization]}
      contacts={[]}
      onCancel={() => undefined}
      onSaved={() => undefined}
    />,
  )
  await user.click(screen.getByRole("button", { name: "Save" }))
  expect(screen.getByText("Organization is required")).toBeTruthy()
})

test("cancel closes the deal form", async () => {
  const onCancel = vi.fn()
  const user = userEvent.setup()
  render(
    <DealForm organizations={[]} contacts={[]} onCancel={onCancel} onSaved={() => undefined} />,
  )
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(onCancel).toHaveBeenCalledOnce()
})
