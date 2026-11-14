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

test("the top bar finds an organization, a contact, and a deal", async ({ page }) => {
  await signIn(page)
  const search = page.getByLabel("Search")

  await search.fill("lUmEn")
  await page
    .locator(".search-results")
    .getByRole("link", { name: /Lumen Clinic/ })
    .click()
  await expect(page.getByRole("heading", { name: "Lumen Clinic" })).toBeVisible()

  await search.fill("pRiYa")
  await page
    .locator(".search-results")
    .getByRole("link", { name: /Priya Shah/ })
    .click()
  await expect(page.getByRole("heading", { name: "Priya Shah" })).toBeVisible()

  await search.fill("pOrTaL")
  await page
    .locator(".search-results")
    .getByRole("link", { name: /Clinic portal/ })
    .click()
  await expect(page.getByRole("heading", { name: "Clinic portal" })).toBeVisible()
})
