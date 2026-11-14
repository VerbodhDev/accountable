import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Node does not provide localStorage unless a file is named. Tests need a store.
if (globalThis.localStorage == null) {
  const values = new Map<string, string>()
  const memory: Storage = {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, "localStorage", { value: memory, configurable: true })
}

afterEach(() => {
  cleanup()
})
