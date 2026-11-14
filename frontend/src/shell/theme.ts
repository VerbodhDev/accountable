export const THEME_KEY = "accountable-theme"

export type Theme = "light" | "dark"

function storage(): Storage | null {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function readTheme(): Theme {
  try {
    return storage()?.getItem(THEME_KEY) === "dark" ? "dark" : "light"
  } catch {
    return "light"
  }
}

export function applyTheme(theme: Theme) {
  const next: Theme = theme === "dark" ? "dark" : "light"
  document.documentElement.dataset.theme = next
  try {
    storage()?.setItem(THEME_KEY, next)
  } catch {
    // The page still follows the choice for this visit when storage is blocked.
  }
}
