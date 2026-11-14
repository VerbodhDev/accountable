import { afterEach, expect, test, vi } from "vitest"
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
  localStorage.setItem(THEME_KEY, "system")
  expect(readTheme()).toBe("system")
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

test("system follows a mocked device setting", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  }))
  applyTheme("system")
  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(localStorage.getItem(THEME_KEY)).toBe("system")
  vi.unstubAllGlobals()
})
