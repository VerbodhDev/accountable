import { expect, test } from "vitest"
import { money } from "./money"

test("money text uses the dollar sign and two decimals", () => {
  expect(money(125000)).toBe("$1,250.00")
  expect(money(0)).toBe("$0.00")
  expect(money(10)).toBe("$0.10")
  expect(money(1800000)).toBe("$18,000.00")
})
