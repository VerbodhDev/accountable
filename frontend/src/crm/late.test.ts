import { expect, test } from "vitest"
import { MARKS, isLate, markStyle } from "./late"

test("an open deal before today is late and a won deal is not", () => {
  const today = "2026-11-13"
  expect(isLate("Proposal", "2026-11-12", today)).toBe(true)
  expect(isLate("New", "2026-11-13", today)).toBe(false)
  expect(isLate("Qualified", null, today)).toBe(false)
  expect(isLate("Won", "2026-11-01", today)).toBe(false)
  expect(isLate("Lost", "2026-11-01", today)).toBe(false)
  expect(MARKS.Lead).toEqual({ background: "#118AB2", color: "#ffffff" })
  expect(MARKS.Qualified).toEqual({ background: "#FFC145", color: "#073B4C" })
  expect(MARKS.Customer).toEqual({ background: "#06D6A0", color: "#073B4C" })
  expect(MARKS.Late).toEqual({ background: "#EF476F", color: "#ffffff" })
  expect(MARKS.Overdue).toEqual({ background: "#EF476F", color: "#ffffff" })
  expect(markStyle("Late")).toEqual(MARKS.Late)
})
