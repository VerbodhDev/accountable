import { screen } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { dashboard } from "./test/fixtures"

test("the app opens on the dashboard", async () => {
  document.body.innerHTML = '<div id="root"></div>'
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      status: 200,
      ok: true,
      text: async () => JSON.stringify(dashboard()),
    })),
  )
  await import("./main")
  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy()
  expect(screen.getByText("Accountable")).toBeTruthy()
})
