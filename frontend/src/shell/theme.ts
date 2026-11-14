export const THEME_KEY = "accountable-theme"

export type Theme = "light" | "dark" | "system"

function storage(): Storage | null {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function readTheme(): Theme {
  try {
    const stored = storage()?.getItem(THEME_KEY)
    if (stored === "dark" || stored === "system") return stored
    return "light"
  } catch {
    return "light"
  }
}

export function systemIsDark(): boolean {
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
}

export function applyTheme(theme: Theme) {
  const next: Theme = theme === "dark" || theme === "system" ? theme : "light"
  const dark = next === "dark" || (next === "system" && systemIsDark())
  document.documentElement.dataset.theme = dark ? "dark" : "light"
  try {
    storage()?.setItem(THEME_KEY, next)
  } catch {
    // The page still follows the choice for this visit when storage is blocked.
  }
}
