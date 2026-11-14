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

async function signIn(page: Page) {
  await page.goto("/")
  await page.getByLabel("Email").fill("alex.rivera@example.com")
  await page.getByLabel("Password").fill("local-only")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
}

test("the menu stores dark mode and system follows the device", async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole("button", { name: "Dark mode" })).toHaveCount(0)
  await page.getByRole("button", { name: "AR", exact: true }).click()
  await expect(page.getByRole("button", { name: "Light", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await page.getByRole("button", { name: "Dark", exact: true }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expect(page.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.getByRole("button", { name: "AR", exact: true }).click()
  await expect(page.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.emulateMedia({ colorScheme: "dark" })
  await page.getByRole("button", { name: "System", exact: true }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.emulateMedia({ colorScheme: "light" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  expect(await page.evaluate(() => localStorage.getItem("accountable-theme"))).toBe("system")
})
