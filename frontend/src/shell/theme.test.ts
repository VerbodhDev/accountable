import { afterEach, expect, test } from "vitest"
import { THEME_KEY, applyTheme, readTheme } from "./theme"

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

test("a missing choice is light mode", () => {
  expect(readTheme()).toBe("light")
})

test("only the stored dark choice turns dark mode on", () => {
  localStorage.setItem(THEME_KEY, "dark")
  expect(readTheme()).toBe("dark")
  localStorage.setItem(THEME_KEY, "dim")
  expect(readTheme()).toBe("light")
})

test("applying a choice sets the page and the stored value", () => {
  applyTheme("dark")
  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(localStorage.getItem(THEME_KEY)).toBe("dark")
  applyTheme("light")
  expect(document.documentElement.dataset.theme).toBe("light")
  expect(localStorage.getItem(THEME_KEY)).toBe("light")
})
