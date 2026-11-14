import { expect, test } from "vitest"
import { activity, contact, deal, organization, stageEntry, today } from "../test/fixtures"
import {
  activityDeleteText,
  contactDeleteText,
  dealDeleteText,
  organizationDeleteText,
  stageDeleteText,
  timelineDeleteText,
  timelineDescription,
} from "./deleteText"

test("a contact timeline names the deal that stays", () => {
  expect(timelineDeleteText({ kind: "stage", record_name: "Website refresh" }, "Ada West")).toBe(
    "Delete this stage entry? Website refresh stays in its current stage.",
  )
  expect(timelineDeleteText({ kind: "activity", record_name: "Website refresh" }, "Ada West")).toBe(
    "Delete this activity? Website refresh stays.",
  )
  expect(timelineDeleteText({ kind: "activity", record_name: "Ada West" }, "Ada West")).toBe(
    "Delete this activity? Ada West stays.",
  )
})

test("a deal timeline names that deal and its stage", () => {
  expect(
    timelineDeleteText(
      { kind: "stage", record_name: "Annual retainer" },
      "Annual retainer",
      "Negotiation",
    ),
  ).toBe("Delete this stage entry? Annual retainer stays in Negotiation.")
})

test("delete text names the records that go and the records that stay", () => {
  expect(organizationDeleteText({ ...organization, contacts: [], deals: [] })).toBe(
    "Delete Northwind? No contacts are linked. No deals are linked. Their activities and stage entries are deleted too.",
  )
  expect(organizationDeleteText({ ...organization, contacts: [contact], deals: [deal] })).toContain(
    "These contacts are deleted: Ada West.",
  )
  expect(organizationDeleteText({ ...organization, contacts: [contact], deals: [deal] })).toContain(
    "These deals are deleted: Kitchen rollout.",
  )

  const person = {
    ...contact,
    deals: [] as (typeof deal)[],
    timeline: [
      activity({ description: "", title: "Call" }),
      activity({ id: 8, deal_id: 3, description: "On a deal" }),
      stageEntry(),
    ],
    today,
  }
  expect(contactDeleteText(person)).toContain("These activities are deleted: Call.")
  expect(contactDeleteText(person)).toContain("No deal uses this main contact.")
  expect(contactDeleteText({ ...person, deals: [deal] })).toContain(
    "These deals stay, and they lose this main contact: Kitchen rollout.",
  )

  const openDeal = { ...deal, timeline: [activity(), stageEntry()], today }
  expect(dealDeleteText(openDeal)).toContain(
    "These activities are deleted: Spoke about the kitchen.",
  )
  expect(dealDeleteText(openDeal)).toContain("These stage entries are deleted: Proposal.")
  expect(dealDeleteText(openDeal)).toContain("Northwind stays. Ada West stays.")
  expect(dealDeleteText({ ...openDeal, contact_name: null, timeline: [] })).toContain(
    "No activities are linked. No stage entries are linked.",
  )
  expect(dealDeleteText({ ...openDeal, contact_name: null, timeline: [] })).toContain(
    "No main contact is set.",
  )
  expect(activityDeleteText("Ada West")).toBe("Delete this activity? Ada West stays.")
  expect(stageDeleteText("Kitchen rollout", "Won")).toBe(
    "Delete this stage entry? Kitchen rollout stays in Won.",
  )
})

test("a timeline line prefers the description, then the detail, then the title", () => {
  expect(timelineDescription(activity({ description: "Spoken" }))).toBe("Spoken")
  expect(timelineDescription(activity({ description: "", detail: "Detail" }))).toBe("Detail")
  expect(timelineDescription(activity({ description: "", detail: "", title: "Title" }))).toBe(
    "Title",
  )
  expect(timelineDeleteText({ kind: "activity", record_name: "" }, "Ada West")).toBe(
    "Delete this activity? Ada West stays.",
  )
})
