import type { APIRequestContext, Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { addContact, addDeal, addOrganization, column } from "./helpers";

test("the button is on the dashboard and on a missing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Copilot" })).toBeVisible();

  await page.goto("/nothing-here");
  await expect(page.getByRole("heading", { level: 1, name: "This page no longer exists" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copilot" })).toBeVisible();
});

test("which deals close this month shows the tool line and those deals", async ({ page, request }) => {
  await page.goto("/");
  const names = await closingThisMonth(request);
  const panel = await ask(page, "Which deals close this month?");
  await expect(panel.getByText("Looking up deals closing this month")).toBeVisible();
  await expect(panel.getByText(`These deals close this month: ${names.join(", ")}.`)).toBeVisible();
});

test("moving a deal waits for Confirm, then the card is in the new stage", async ({ page, request }) => {
  const organization = await addOrganization(request, "Harbour Dental");
  const contact = await addContact(request, "Harbour Contact", organization.id);
  await addDeal(request, "Website refresh", {
    organization_id: organization.id,
    main_contact_id: contact.id,
    stage: "proposal",
  });
  await page.goto("/pipeline");
  const card = '[data-deal="Website refresh"]';
  await expect(column(page, "proposal").locator(card)).toBeVisible();

  const panel = await ask(page, "Move Harbour Dental's Website refresh deal to negotiation");
  await expect(
    panel.getByText("Move Harbour Dental's Website refresh deal to Negotiation", { exact: true }),
  ).toBeVisible();
  await expect(column(page, "proposal").locator(card)).toBeVisible();
  await expect(column(page, "negotiation").locator(card)).toHaveCount(0);

  await panel.getByRole("button", { name: "Confirm" }).click();
  await expect(column(page, "negotiation").locator(card)).toBeVisible();
  await expect(column(page, "proposal").locator(card)).toHaveCount(0);
});

test("asking to delete a record says the Copilot cannot do that", async ({ page }) => {
  await page.goto("/");
  const panel = await ask(page, "Delete the Payroll integration record");
  await expect(panel.getByText("The Copilot cannot do that.")).toBeVisible();
});

test("a reload opens an empty panel", async ({ page }) => {
  await page.goto("/");
  const panel = await ask(page, "Which deals close this month?");
  await expect(panel.getByText("Looking up deals closing this month")).toBeVisible();

  await page.reload();
  const again = await openPanel(page);
  await expect(again.getByText("Looking up deals closing this month")).toHaveCount(0);
  await expect(again.getByRole("textbox", { name: "Ask about your records" })).toHaveValue("");
});

test("with the stub set to no token, the panel says the Copilot needs a token", async ({ page }) => {
  await page.route(
    (url) => url.pathname === "/api/copilot",
    async (route) => {
      await route.continue({
        headers: { ...route.request().headers(), "x-accountable-copilot-mode": "no-token" },
      });
    },
  );
  await page.goto("/");
  const panel = await ask(page, "Which deals close this month?");
  await expect(panel.getByText("The Copilot needs a token.")).toBeVisible();
  await expect(panel.getByRole("textbox", { name: "Ask about your records" })).toBeEnabled();
});

async function openPanel(page: Page) {
  await page.getByRole("button", { name: "Copilot" }).click();
  return page.getByRole("dialog", { name: "Copilot" });
}

async function ask(page: Page, question: string) {
  const panel = await openPanel(page);
  await panel.getByRole("textbox", { name: "Ask about your records" }).fill(question);
  await panel.getByRole("button", { name: "Send" }).click();
  return panel;
}

async function closingThisMonth(request: APIRequestContext) {
  const deals = (await (await request.get("/api/deals")).json()) as { name: string; close_date: string }[];
  const board = (await (await request.get("/api/dashboard")).json()) as { today: string };
  const month = board.today.slice(0, 7);
  return deals.filter((deal) => deal.close_date.startsWith(month)).map((deal) => deal.name);
}
