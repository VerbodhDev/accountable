import { expect, test } from "vitest"
import { isOpenStage, stageInk } from "./stages"

test("open stages use midnight ink and closed stages use white", () => {
  expect(stageInk("New")).toBe("#073B4C")
  expect(stageInk("Qualified")).toBe("#073B4C")
  expect(stageInk("Proposal")).toBe("#073B4C")
  expect(stageInk("Negotiation")).toBe("#ffffff")
  expect(stageInk("Won")).toBe("#ffffff")
  expect(stageInk("Lost")).toBe("#ffffff")
  expect(isOpenStage("Proposal")).toBe(true)
  expect(isOpenStage("Won")).toBe(false)
  expect(isOpenStage("Lost")).toBe(false)
})
