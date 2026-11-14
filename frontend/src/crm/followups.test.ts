import { expect, test } from "vitest"
import { followUpMark, splitFollowUps } from "./followups"

test("follow-ups split into overdue and the next seven days", () => {
  const today = "2026-11-13"
  const rows = [
    { id: 2, description: "newer overdue", follow_up_date: "2026-11-10", done: false },
    { id: 1, description: "older overdue", follow_up_date: "2026-11-01", done: false },
    { id: 3, description: "today", follow_up_date: "2026-11-13", done: false },
    { id: 4, description: "edge", follow_up_date: "2026-11-20", done: false },
    { id: 5, description: "later", follow_up_date: "2026-11-21", done: false },
    { id: 6, description: "done", follow_up_date: "2026-11-01", done: true },
    { id: 7, description: "no date", follow_up_date: null, done: false },
  ]
  const split = splitFollowUps(rows, today)
  expect(split.overdue.map((row) => row.description)).toEqual(["older overdue", "newer overdue"])
  expect(split.upcoming.map((row) => row.description)).toEqual(["today", "edge"])
  expect(followUpMark("2026-11-01", today)).toBe("Overdue")
  expect(followUpMark("2026-11-13", today)).toBe(null)
  expect(followUpMark(null, today)).toBe(null)
})

test("the seven day window crosses a month boundary", () => {
  const split = splitFollowUps(
    [
      { id: 1, description: "inside", follow_up_date: "2026-12-04", done: false },
      { id: 2, description: "outside", follow_up_date: "2026-12-05", done: false },
    ],
    "2026-11-27",
  )
  expect(split.upcoming.map((row) => row.description)).toEqual(["inside"])
  expect(split.overdue).toEqual([])
})

test("the same follow-up date keeps the lower id first", () => {
  const split = splitFollowUps(
    [
      { id: 9, description: "later id", follow_up_date: "2026-11-01", done: false },
      { id: 2, description: "earlier id", follow_up_date: "2026-11-01", done: false },
    ],
    "2026-11-14",
  )
  expect(split.overdue.map((row) => row.id)).toEqual([2, 9])
  expect(followUpMark("2026-11-20", "2026-11-14")).toBe(null)
})
