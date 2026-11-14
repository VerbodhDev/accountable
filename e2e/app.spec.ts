import { expect, test, type Locator, type Page } from "@playwright/test"

test.describe.configure({ mode: "serial" })

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
  await signIn(page)
})

async function signIn(page: Page) {
  await page.goto("/")
  await page.getByLabel("Email").fill("alex.rivera@example.com")
  await page.getByLabel("Password").fill("local-only")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
}

test.afterEach(() => {
  expect(errors).toEqual([])
})

function localToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

async function dragCard(page: Page, from: Locator, to: Locator) {
  const start = await from.boundingBox()
  const end = await to.boundingBox()
  if (!start || !end) throw new Error("The drag target has no box")
  const startX = start.x + start.width / 2
  const startY = start.y + start.height / 2
  const endX = end.x + end.width / 2
  const endY = end.y + Math.min(36, end.height / 2)
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 12, startY + 12, { steps: 5 })
  await page.mouse.move(endX, endY, { steps: 30 })
  await page.mouse.up()
}

test("open the dashboard", async ({ page }) => {
  await page.goto("/")
  for (const label of ["Dashboard", "Organizations", "Contacts", "Deals", "Pipeline"]) {
    await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible()
  }
  await expect(page.locator(".stats article")).toHaveCount(5)
  for (const label of [
    "Open pipeline",
    "Expected revenue",
    "Revenue won this month",
    "Deals won this month",
    "Overdue follow-ups",
  ]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  }
  await expect(page.locator(".stats .v").nth(0)).toHaveText(/^\$\d{1,3}(,\d{3})*\.\d{2}$/)
  await expect(page.getByRole("heading", { name: "Revenue won" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Expected revenue" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Sales funnel" })).toBeVisible()
  await expect(
    page.getByText("Last 6 months. The number on a point is the deals won."),
  ).toBeVisible()
  await expect(page.getByText("Open stages only. Value times probability.")).toBeVisible()
  await expect(page.getByText("Value sitting in each open stage now.")).toBeVisible()
  await expect(page.getByText("Moved from Proposal to Negotiation")).toBeVisible()
  await expect(page.getByText("Call Priya about the portal", { exact: true })).toBeVisible()
  await expect(page.getByText("Overdue", { exact: true }).first()).toBeVisible()
})

test("add, search, and sort", async ({ page }) => {
  await page.goto("/organizations")
  await expect(page.getByRole("link", { name: "Brightpath Software" })).toBeVisible()
  await page.getByLabel("Search organizations").fill("lumen")
  await expect(page.getByRole("link", { name: "Lumen Clinic" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Brightpath Software" })).toHaveCount(0)
  await page.getByLabel("Search organizations").fill("")
  await page.getByRole("button", { name: "Name", exact: true }).click()
  await expect(page.locator("tbody tr td a").first()).toHaveText("Oak & Iron")
  await page.getByRole("button", { name: "Add organization" }).click()
  await page.getByLabel("Name").fill("Practice Co")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("link", { name: "Practice Co" })).toBeVisible()
  await page.reload()
  await expect(page.getByRole("link", { name: "Practice Co" })).toBeVisible()
  await page.getByRole("link", { name: "Brightpath Software" }).click()
  await page.getByRole("button", { name: "Add contact" }).click()
  await page.getByLabel("Name").fill("Pat Lee")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("link", { name: "Pat Lee" })).toBeVisible()
  await page.getByRole("button", { name: "Add deal" }).click()
  await page.getByLabel("Name").fill("Practice rollout")
  await page.getByLabel("Value").fill("1500")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("link", { name: "Practice rollout" })).toBeVisible()
  await page.getByRole("link", { name: "Pat Lee" }).click()
  await expect(page.getByRole("link", { name: "Brightpath Software" })).toBeVisible()
  await page.goto("/organizations")
  await page.getByRole("link", { name: "Brightpath Software" }).click()
  await page.getByRole("link", { name: "Practice rollout" }).click()
  await expect(page.getByRole("link", { name: "Brightpath Software" })).toBeVisible()
})

test("contact filter", async ({ page }) => {
  await page.goto("/contacts")
  await page
    .getByRole("group", { name: "Status" })
    .getByRole("button", { name: "Lead", exact: true })
    .click()
  await expect(page.getByRole("link", { name: "Ada West" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Priya Shah" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Ida Ross" })).toHaveCount(0)
  await page
    .getByRole("group", { name: "Status" })
    .getByRole("button", { name: "Qualified", exact: true })
    .click()
  await expect(page.getByRole("link", { name: "Priya Shah" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Ada West" })).toHaveCount(0)
  await page
    .getByRole("group", { name: "Status" })
    .getByRole("button", { name: "Customer", exact: true })
    .click()
  await expect(page.getByRole("link", { name: "Ida Ross" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Ada West" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Priya Shah" })).toHaveCount(0)
})

test("delete asks and a bad field stays open", async ({ page }) => {
  await page.goto("/organizations")
  await page
    .getByRole("row", { name: /Brightpath Software/ })
    .getByRole("button", { name: "Delete" })
    .click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toContainText("Ada West")
  await expect(dialog).toContainText("Nina Foss")
  await expect(dialog).toContainText("Website refresh")
  await expect(dialog).toContainText("Roof study")
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(page.getByRole("link", { name: "Brightpath Software" })).toBeVisible()
  await page.getByRole("button", { name: "Add organization" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("dialog")).toContainText("Name is required")
  await expect(page.getByRole("dialog")).toBeVisible()
})

test("drag inside a column", async ({ page }) => {
  await page.goto("/pipeline")
  const column = page.getByTestId("column-New")
  const first = column.locator("[data-testid^='card-']").first()
  const firstName = await first.getAttribute("data-testid")
  const saved = page.waitForResponse(
    (response) => response.url().includes("/api/deals/") && response.request().method() === "PATCH",
  )
  await dragCard(page, first, column.locator("[data-testid^='card-']").last())
  await saved
  await page.reload()
  await expect(column.locator("[data-testid^='card-']").last()).toHaveAttribute(
    "data-testid",
    firstName || "",
  )
})

test("drag to another column", async ({ page }) => {
  await page.goto("/pipeline")
  const before = await page.getByTestId("pipeline-expected").textContent()
  const saved = page.waitForResponse(
    (response) => response.url().includes("/api/deals/") && response.request().method() === "PATCH",
  )
  await dragCard(
    page,
    page.getByTestId("card-Staff training"),
    page.getByTestId("column-Qualified"),
  )
  await saved
  await page.reload()
  await expect(
    page.getByTestId("column-Qualified").getByTestId("card-Staff training"),
  ).toBeVisible()
  await expect(page.getByTestId("column-New").getByTestId("card-Staff training")).toHaveCount(0)
  await expect(page.getByTestId("pipeline-expected")).not.toHaveText(before || "")
  await page.goto("/deals")
  const row = page.getByRole("row", { name: /Staff training/ })
  await expect(row).toContainText("Qualified")
  await expect(row).toContainText("30")
})

test("log a follow-up and mark it done", async ({ page }) => {
  await page.goto("/deals")
  await page.getByRole("link", { name: "Menu reprint" }).click()
  await page.getByLabel("Description").fill("Chase the sample invoice")
  await page.getByLabel("Follow-up date").fill(localToday())
  await page.getByRole("button", { name: "Log" }).click()
  await expect(page.getByText("Chase the sample invoice")).toBeVisible()
  await page.goto("/")
  const task = page.locator(".task", { hasText: "Chase the sample invoice" })
  await expect(task).toBeVisible()
  await task.getByRole("button", { name: "Mark done" }).click()
  await expect(task).toHaveCount(0)
  await page.goto("/deals")
  await page.getByRole("link", { name: "Menu reprint" }).click()
  await expect(page.getByText("Chase the sample invoice")).toBeVisible()
})

test("stage entry text", async ({ page }) => {
  await page.goto("/deals")
  await page.getByRole("link", { name: "Yard signs", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Yard signs", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Edit" }).click()
  await page.getByLabel("Stage").selectOption("Proposal")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Moved from Qualified to Proposal")).toBeVisible()
})
