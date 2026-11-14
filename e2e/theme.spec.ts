import { expect, test, type Page } from "@playwright/test"

let errors: string[] = []

test.beforeEach(async ({ page }) => {
  errors = []
  page.on("console", (message) => {
    if (message.type() !== "error") return
    const text = message.text()
    if (text.includes("favicon")) return
    errors.push(text)
  })
  page.on("pageerror", (error) => errors.push(String(error)))
})

test.afterEach(() => {
  expect(errors).toEqual([])
})

async function shot(page: Page, name: string) {
  if (process.env.SHOTS !== "1") return
  await page.screenshot({ path: `docs/changes/dark-mode/${name}.png`, fullPage: true })
}

test("dark mode turns on and stays on after a reload", async ({ page }) => {
  await page.goto("/")
  const toggle = page.getByRole("button", { name: "Dark mode" })
  await expect(toggle).toHaveAttribute("aria-pressed", "false")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await shot(page, "dashboard-light")
  await page.goto("/pipeline")
  await shot(page, "pipeline-light")
  await page.goto("/")
  await toggle.click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expect(toggle).toHaveAttribute("aria-pressed", "true")
  await shot(page, "dashboard-dark")
  await page.goto("/pipeline")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await shot(page, "pipeline-dark")
  await page.goto("/")
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expect(page.getByRole("button", { name: "Dark mode" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
})
