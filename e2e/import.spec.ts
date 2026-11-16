import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { SIGNED_IN, card, column, resetToSampleData } from "./helpers";

// Every name, address and figure below is made up. Each test starts from the sample data.
test.beforeEach(resetToSampleData);

const COMPANIES = [
  "Record ID,Company name,Industry,City",
  "1,Marigold Kitchens,Catering,Singapore",
  "2,Reed Willow Events,Events,",
  "3,,Events,",
  "",
].join("\r\n");

const CONTACTS = [
  "Record ID,First Name,Last Name,Email,Company Name,Lifecycle Stage",
  "10,Asha,Reed,asha@marigold.example,Marigold Kitchens,Customer",
  "11,Ben,Okoro,ben@reedwillow.example,Reed Willow Events,Opportunity",
  "12,Cara,Lim,cara@harbourside.example,Harbourside Weddings,Lead",
  "",
].join("\r\n");

const DEALS = [
  "Record ID,Deal Name,Deal Stage,Amount,Close Date,Number of Associated Contacts,Associated Company (Primary),Associated Contact",
  "30,Spring wedding,Contract Sent,12000.0,2026-12-01 09:30,1.0,Marigold Kitchens,Asha Reed (asha@marigold.example)",
  "31,Garden party,Closed Won,3000,2026-01-05 18:00,1.0,Reed Willow Events,Ben Okoro (ben@reedwillow.example)",
  "32,Tasting,Waiting for tasting,100,2026-12-05,1.0,Marigold Kitchens,Asha Reed (asha@marigold.example)",
  "",
].join("\r\n");

async function openImport(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: `Menu for ${SIGNED_IN.name}` })
    .click();
  await page.getByRole("menu").getByRole("menuitem", { name: "Import" }).click();
  await expect(page).toHaveURL(/\/import$/);
  await expect(page.getByRole("heading", { level: 1, name: "Import from HubSpot" })).toBeVisible();
  await expect(page).toHaveTitle("Import from HubSpot | Accountable");
}

async function choose(page: Page, kind: "Companies" | "Contacts" | "Deals", name: string, text: string) {
  await page.getByRole("radio", { name: kind, exact: true }).check();
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
}

async function importFile(
  page: Page,
  kind: "Companies" | "Contacts" | "Deals",
  name: string,
  text: string,
  button: string,
  added: string,
) {
  await choose(page, kind, name, text);
  await page.getByRole("button", { name: button }).click();
  await expect(page.getByText(added)).toBeVisible();
}

test("a companies file previews with its counts and rejected row, then adds the new companies", async ({ page }) => {
  await openImport(page);
  await choose(page, "Companies", "companies.csv", COMPANIES);

  const figures = page.getByRole("group", { name: "What the file holds" });
  await expect(figures).toHaveText(/New\s*2.*Already there\s*0.*Rejected\s*1/s);
  await expect(page.getByText("companies.csv")).toBeVisible();
  await expect(page.getByText("Not imported: Record ID")).toBeVisible();
  const rejected = page.getByRole("table", { name: "Rejected rows" });
  await expect(rejected.getByRole("cell", { name: "4" })).toBeVisible();
  await expect(rejected.getByRole("cell", { name: "Enter a name" })).toBeVisible();

  await page.getByRole("button", { name: "Import 2 new companies" }).click();
  await expect(page.getByText("Added 2 organizations.")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Organizations" }).click();
  await expect(page).toHaveURL(/\/organizations$/);
  await expect(page.getByRole("link", { name: "Marigold Kitchens" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reed Willow Events" })).toBeVisible();
});

test("companies, then contacts, then deals fill the lists and the board in their mapped stages", async ({ page }) => {
  await openImport(page);
  await importFile(page, "Companies", "companies.csv", COMPANIES, "Import 2 new companies", "Added 2 organizations.");
  await page.getByRole("button", { name: "Import another file" }).click();
  await importFile(
    page,
    "Contacts",
    "contacts.csv",
    CONTACTS,
    "Import 3 new contacts",
    "Added 3 contacts and 1 organization.",
  );
  await page.getByRole("button", { name: "Import another file" }).click();
  await importFile(page, "Deals", "deals.csv", DEALS, "Import 2 new deals", "Added 2 deals.");

  await page.goto("/pipeline");
  await expect(card(page, "Spring wedding")).toBeVisible();
  await expect(column(page, "negotiation").locator('[data-deal="Spring wedding"]')).toBeVisible();
  await expect(column(page, "won").locator('[data-deal="Garden party"]')).toBeVisible();
  await expect(page.getByText("Tasting", { exact: true })).toHaveCount(0);

  await page.goto("/contacts");
  await expect(page.getByRole("link", { name: "Cara Lim" })).toBeVisible();
});

test("the same file a second time adds nothing and offers no import", async ({ page }) => {
  await openImport(page);
  await importFile(page, "Companies", "companies.csv", COMPANIES, "Import 2 new companies", "Added 2 organizations.");
  await page.getByRole("button", { name: "Import another file" }).click();
  await choose(page, "Companies", "companies.csv", COMPANIES);
  const figures = page.getByRole("group", { name: "What the file holds" });
  await expect(figures).toHaveText(/New\s*0.*Already there\s*2.*Rejected\s*1/s);
  await expect(page.getByRole("button", { name: "Import 0 new companies" })).toBeDisabled();
});

test("a file of the wrong kind is refused with a message and no import button", async ({
  page,
  expectConsoleError,
}) => {
  expectConsoleError(/Failed to load resource/);
  await openImport(page);
  await choose(page, "Contacts", "companies.csv", COMPANIES);
  await expect(page.getByRole("alert")).toHaveText(
    "This is not a HubSpot contacts file. It has no First Name and Last Name columns.",
  );
  await expect(page.getByRole("button", { name: /^Import \d/ })).toHaveCount(0);
});
