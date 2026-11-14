import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { ExpectedChart, FunnelChart, RevenueChart } from "./Charts"

const months = [{ key: "2026-11", label: "Nov", cents: 2000, count: 1 }]
const stages = [
  { stage: "New", count: 1, value_cents: 10000, expected_cents: 1000 },
  { stage: "Proposal", count: 1, value_cents: 4000, expected_cents: 2000 },
]

test("the three charts name revenue, expected revenue, and the funnel", () => {
  render(
    <>
      <RevenueChart months={months} />
      <ExpectedChart stages={stages} />
      <FunnelChart stages={stages} />
    </>,
  )
  expect(screen.getByRole("heading", { name: "Revenue won" })).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Expected revenue" })).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Sales funnel" })).toBeTruthy()
  expect(screen.getAllByText("$25.00").length).toBeGreaterThan(0)
  expect(screen.getByText("Last 6 months. The number on a point is the deals won.")).toBeTruthy()
  expect(screen.getByText("Value sitting in each open stage now.")).toBeTruthy()
})
