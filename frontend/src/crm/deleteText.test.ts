import { expect, test } from "vitest"
import { timelineDeleteText } from "./deleteText"

test("a contact timeline names the deal that stays", () => {
  expect(timelineDeleteText(
    { kind: "stage", record_name: "Website refresh" },
    "Ada West",
  )).toBe("Delete this stage entry? Website refresh stays in its current stage.")
  expect(timelineDeleteText(
    { kind: "activity", record_name: "Website refresh" },
    "Ada West",
  )).toBe("Delete this activity? Website refresh stays.")
  expect(timelineDeleteText(
    { kind: "activity", record_name: "Ada West" },
    "Ada West",
  )).toBe("Delete this activity? Ada West stays.")
})

test("a deal timeline names that deal and its stage", () => {
  expect(timelineDeleteText(
    { kind: "stage", record_name: "Annual retainer" },
    "Annual retainer",
    "Negotiation",
  )).toBe("Delete this stage entry? Annual retainer stays in Negotiation.")
})
