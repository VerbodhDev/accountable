import { expect, test } from "vitest"
import { shortDate, websiteHref } from "./format"

test("a short date uses the month name", () => {
  expect(shortDate("2026-11-14")).toBe("Nov 14")
  expect(shortDate("2026-11-14T09:00:00")).toBe("Nov 14")
  expect(shortDate(null)).toBe("")
  expect(shortDate(undefined)).toBe("")
  expect(shortDate("")).toBe("")
  expect(shortDate("2026-13-01")).toBe("")
  expect(shortDate("2026-00-01")).toBe("")
  expect(shortDate("2026-11-00")).toBe("")
  expect(shortDate("-11-14")).toBe("")
  expect(shortDate("not-a-date")).toBe("")
})

test("a website without a scheme gets https", () => {
  expect(websiteHref("northwind.example")).toBe("https://northwind.example")
  expect(websiteHref("https://northwind.example")).toBe("https://northwind.example")
  expect(websiteHref("mailto:ada@northwind.example")).toBe("mailto:ada@northwind.example")
})
