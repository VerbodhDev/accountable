import { expect, test } from "vitest"
import { dollarInput, money } from "./money"

test("money text uses the dollar sign and two decimals", () => {
  expect(money(125000)).toBe("$1,250.00")
  expect(money(0)).toBe("$0.00")
  expect(money(10)).toBe("$0.10")
  expect(money(1800000)).toBe("$18,000.00")
  expect(money(-125000)).toBe("-$1,250.00")
})

test("a dollar input keeps two decimals without grouping", () => {
  expect(dollarInput(125000)).toBe("1250.00")
  expect(dollarInput(0)).toBe("0.00")
  expect(dollarInput(-10)).toBe("-0.10")
})
