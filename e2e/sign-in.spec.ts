import { expect, test, type Page } from "@playwright/test"

let errors: string[] = []

test.beforeEach(async ({ page }) => {
  errors = []
  page.on("console", (message) => {
    if (message.type() !== "error") return
    const text = message.text()
    if (text.includes("favicon")) return
    if (text.includes("Failed to load resource") && (text.includes("422") || text.includes("404")))
      return
    errors.push(text)
  })
  page.on("pageerror", (error) => errors.push(String(error)))
})

test.afterEach(() => {
  expect(errors).toEqual([])
})

async function signIn(page: Page) {
  await page.getByLabel("Email").fill("alex.rivera@example.com")
  await page.getByLabel("Password").fill("local-only")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
}

test("sign in stays after a reload and sign out returns to the screen", async ({ page }) => {
  await page.goto("/organizations")
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Organizations" })).toHaveCount(0)
  await page.goto("/")
  await signIn(page)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await page.getByRole("button", { name: "AR", exact: true }).click()
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
})
