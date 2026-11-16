import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { holdSaves, mockApi, renderApp, startSignedIn, user } from "../test-utils";
import { ImportPage } from "./ImportPage";

const REPLY = {
  deals: [] as { row: number; name: string; stage: string; value: number; amount: string; rounded: boolean }[],
  counts: { new: 2, existing: 1, rejected: 1, companies_to_add: 0, contacts_to_add: 0 },
  rejected: [{ row: 4, reason: "Enter a name" }],
  rejected_more: 0,
  ignored_columns: ["Record ID", "Company owner"],
  saved: false,
};
const SAVED = { ...REPLY, saved: true, rejected: [], counts: { ...REPLY.counts, rejected: 0 } };
const TEXT = "Company name\r\nMarigold Kitchens\r\nReed Willow Events\r\n";

function file(text = TEXT, name = "companies.csv") {
  return new File([text], name, { type: "text/csv" });
}

function showPage(routes: Record<string, unknown> = {}) {
  startSignedIn();
  const calls = mockApi({
    "POST /imports/companies": (body: unknown) => ({ body: (body as { save: boolean }).save ? SAVED : REPLY }),
    ...routes,
  });
  renderApp(<ImportPage />);
  return calls;
}

async function choose(chosen = file()) {
  await user().upload(screen.getByLabelText("CSV file"), chosen);
}

describe("the Import page", () => {
  it("has its title, the three kinds, a file button and no preview at first", () => {
    showPage();
    expect(screen.getByRole("heading", { name: "Import from HubSpot" })).toBeTruthy();
    const kinds = screen.getAllByRole("radio");
    expect(kinds.map((radio) => (radio as HTMLInputElement).value)).toEqual(["companies", "contacts", "deals"]);
    expect((screen.getByRole("radio", { name: "Companies" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Choose file" })).toBeTruthy();
    expect(screen.queryByText("Already there")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Import \d/ })).toBeNull();
  });

  it("says under Deals how to export them, so the association columns are there", () => {
    showPage();
    expect(screen.getByText(/All properties and all associations on records/)).toBeTruthy();
  });

  it("previews a chosen file: the figures, the ignored columns and the rejected rows", async () => {
    const calls = showPage();
    await choose();
    expect(await screen.findByText("Already there")).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST")).toEqual([
      { method: "POST", path: "/imports/companies", body: { csv: TEXT, save: false } },
    ]);
    const figures = screen.getByRole("group", { name: "What the file holds" });
    expect(within(figures).getByText("New").nextElementSibling?.textContent).toBe("2");
    expect(within(figures).getByText("Already there").nextElementSibling?.textContent).toBe("1");
    expect(within(figures).getByText("Rejected").nextElementSibling?.textContent).toBe("1");
    expect(screen.getByText("Not imported: Record ID and Company owner")).toBeTruthy();
    const table = screen.getByRole("table", { name: "Rejected rows" });
    expect(within(table).getByRole("cell", { name: "4" })).toBeTruthy();
    expect(within(table).getByRole("cell", { name: "Enter a name" })).toBeTruthy();
    expect(screen.getByText("companies.csv")).toBeTruthy();
  });

  it("shows how many rejected rows are not listed", async () => {
    showPage({ "POST /imports/companies": { ...REPLY, rejected_more: 40 } });
    await choose();
    expect(await screen.findByText("and 40 more rejected rows")).toBeTruthy();
  });

  it("names a few of the ignored columns and counts the rest", async () => {
    const many = Array.from({ length: 10 }, (_, index) => `Column ${index + 1}`);
    showPage({ "POST /imports/companies": { ...REPLY, ignored_columns: many } });
    await choose();
    expect(
      await screen.findByText("Not imported: Column 1, Column 2, Column 3, Column 4, Column 5, Column 6 and 4 more"),
    ).toBeTruthy();
  });

  it("names the count and the kind on the button, saves once, and says what was added", async () => {
    const calls = showPage();
    await choose();
    const button = await screen.findByRole("button", { name: "Import 2 new companies" });
    await user().click(button);
    expect(await screen.findByText("Added 2 organizations. 1 was already there.")).toBeTruthy();
    expect(calls.filter((call) => call.body && (call.body as { save: boolean }).save)).toEqual([
      { method: "POST", path: "/imports/companies", body: { csv: TEXT, save: true } },
    ]);
    expect(screen.getByRole("link", { name: "Organizations" }).getAttribute("href")).toBe("/organizations");
    expect(screen.queryByRole("button", { name: /^Import \d/ })).toBeNull();
  });

  it("saves once however quickly the button is pressed", async () => {
    const calls = showPage();
    await choose();
    const button = await screen.findByRole("button", { name: "Import 2 new companies" });
    const release = holdSaves();
    const press = user();
    await press.click(button);
    await press.click(screen.getByRole("button", { name: "Importing" }));
    release();
    expect(await screen.findByText(/^Added 2 organizations/)).toBeTruthy();
    expect(calls.filter((call) => call.body && (call.body as { save: boolean }).save)).toHaveLength(1);
  });

  it("offers no import when nothing in the file is new", async () => {
    showPage({
      "POST /imports/companies": {
        ...REPLY,
        counts: { ...REPLY.counts, new: 0, existing: 3, rejected: 0 },
        rejected: [],
      },
    });
    await choose();
    expect(await screen.findByText("Already there")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Import 0 new companies" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the companies and contacts a deal file would add", async () => {
    showPage({
      "POST /imports/deals": {
        ...REPLY,
        counts: { new: 3, existing: 0, rejected: 0, companies_to_add: 2, contacts_to_add: 1 },
        rejected: [],
      },
    });
    await user().click(screen.getByRole("radio", { name: /Deals/ }));
    await choose(file("x", "deals.csv"));
    const figures = await screen.findByRole("group", { name: "What the file holds" });
    expect(within(figures).getByText("Companies to add").nextElementSibling?.textContent).toBe("2");
    expect(within(figures).getByText("Contacts to add").nextElementSibling?.textContent).toBe("1");
    await user().click(screen.getByRole("button", { name: "Import 3 new deals" }));
    expect(await screen.findByText("Added 3 deals, 2 organizations and 1 contact.")).toBeTruthy();
  });

  it("shows the companies a contact file would add", async () => {
    showPage({
      "POST /imports/contacts": {
        ...REPLY,
        counts: { new: 1, existing: 0, rejected: 0, companies_to_add: 1, contacts_to_add: 0 },
        rejected: [],
      },
    });
    await user().click(screen.getByRole("radio", { name: "Contacts" }));
    await choose(file("x", "contacts.csv"));
    const figures = await screen.findByRole("group", { name: "What the file holds" });
    expect(within(figures).getByText("Companies to add").nextElementSibling?.textContent).toBe("1");
    expect(within(figures).queryByText("Contacts to add")).toBeNull();
    await user().click(screen.getByRole("button", { name: "Import 1 new contact" }));
    expect(await screen.findByText("Added 1 contact and 1 organization.")).toBeTruthy();
  });

  it("shows a refused file's message in place of the preview, with no import button", async () => {
    showPage({
      "POST /imports/companies": () => ({
        status: 422,
        body: {
          detail: "Check the form.",
          fields: { csv: "This is not a HubSpot companies file. It has no Company name column." },
        },
      }),
    });
    await choose();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This is not a HubSpot companies file. It has no Company name column.",
    );
    expect(screen.queryByText("Already there")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Import \d/ })).toBeNull();
  });

  it("previews the same file again as another kind when the kind changes", async () => {
    const calls = showPage({ "POST /imports/contacts": { ...REPLY, counts: { ...REPLY.counts, new: 5 } } });
    await choose();
    await screen.findByText("Already there");
    await user().click(screen.getByRole("radio", { name: "Contacts" }));
    expect(await screen.findByRole("button", { name: "Import 5 new contacts" })).toBeTruthy();
    expect(calls.map((call) => call.path)).toEqual(["/imports/companies", "/imports/contacts"]);
    expect(screen.queryByRole("button", { name: "Import 2 new companies" })).toBeNull();
  });

  it("refuses a file over 2 MB without sending it", async () => {
    const calls = showPage();
    await choose(file("x".repeat(2 * 1024 * 1024 + 1), "big.csv"));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This file is too large. Split it into files of 2,000 rows or fewer.",
    );
    expect(calls).toEqual([]);
  });

  it("says a failed request failed, keeps the file and tries again on request", async () => {
    let answers = 0;
    showPage({
      "POST /imports/companies": () =>
        ++answers === 1 ? { status: 500, body: { detail: "Something went wrong." } } : { body: REPLY },
    });
    await choose();
    expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong.");
    expect(screen.getByText("companies.csv")).toBeTruthy();
    await user().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Already there")).toBeTruthy();
  });

  it("clears the preview and the file with Choose another file, and again after a save", async () => {
    showPage();
    await choose();
    await screen.findByText("Already there");
    await user().click(screen.getByRole("button", { name: "Choose another file" }));
    expect(screen.queryByText("Already there")).toBeNull();
    expect(screen.queryByText("companies.csv")).toBeNull();
    await choose();
    await user().click(await screen.findByRole("button", { name: "Import 2 new companies" }));
    await screen.findByText(/^Added 2 organizations/);
    await user().click(screen.getByRole("button", { name: "Import another file" }));
    expect(screen.queryByText(/^Added/)).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Choose file" })).toBeTruthy());
  });

  it("lists the first new deals with their stage and amount, saying when an amount was rounded", async () => {
    showPage({
      "POST /imports/deals": {
        ...REPLY,
        counts: { new: 12, existing: 0, rejected: 0, companies_to_add: 0, contacts_to_add: 0 },
        rejected: [],
        deals: [
          { row: 2, name: "Office lunch", stage: "New", value: 451, amount: "450.5", rounded: true },
          { row: 3, name: "Garden party", stage: "Won", value: 3000, amount: "3000", rounded: false },
        ],
      },
    });
    await user().click(screen.getByRole("radio", { name: "Deals" }));
    await choose(file("x", "deals.csv"));
    const table = await screen.findByRole("table", { name: "New deals" });
    const rows = within(table).getAllByRole("row");
    expect(
      within(rows[1])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["2", "Office lunch", "New", "$451 (rounded from 450.5)"]);
    expect(
      within(rows[2])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["3", "Garden party", "Won", "$3,000"]);
    expect(screen.getByText("and 10 more new deals")).toBeTruthy();
  });

  it("lists no deals for a companies file", async () => {
    showPage();
    await choose();
    await screen.findByText("Already there");
    expect(screen.queryByRole("table", { name: "New deals" })).toBeNull();
  });

  it("shows the file size message for a body the backend found too big, with no Try again", async () => {
    showPage({ "POST /imports/companies": () => ({ status: 413, body: { detail: "That's too big to send." } }) });
    await choose();
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This file is too large. Split it into files of 2,000 rows or fewer.",
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("previews as the kind that is chosen when the file has been read, if the kind changed meanwhile", async () => {
    const calls = showPage({ "POST /imports/contacts": { ...REPLY, counts: { ...REPLY.counts, new: 4 } } });
    let finish = () => {};
    vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (this: FileReader) {
      finish = () => {
        Object.defineProperty(this, "result", { value: TEXT, configurable: true });
        this.onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>);
      };
    });
    await choose();
    await user().click(screen.getByRole("radio", { name: "Contacts" }));
    finish();
    expect(await screen.findByRole("button", { name: "Import 4 new contacts" })).toBeTruthy();
    expect(calls.map((call) => call.path)).toEqual(["/imports/contacts"]);
    vi.restoreAllMocks();
  });

  it("says a file it cannot read cannot be read, and carries on", async () => {
    showPage();
    vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (this: FileReader) {
      this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
    });
    await choose();
    expect((await screen.findByRole("alert")).textContent).toBe("This file could not be read.");
    vi.restoreAllMocks();
    await choose();
    expect(await screen.findByText("Already there")).toBeTruthy();
  });

  it("leaves the kind and the file button alone while a save is on its way", async () => {
    showPage();
    await choose();
    const button = await screen.findByRole("button", { name: "Import 2 new companies" });
    const release = holdSaves();
    await user().click(button);
    expect((screen.getByRole("radio", { name: "Contacts" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Choose file" }) as HTMLButtonElement).disabled).toBe(true);
    release();
    await screen.findByText(/^Added 2 organizations/);
    expect((screen.getByRole("radio", { name: "Contacts" }) as HTMLInputElement).disabled).toBe(false);
  });

  it("announces a short summary of a preview, not every figure and row", async () => {
    showPage();
    await choose();
    await screen.findByText("Already there");
    expect(screen.getByRole("status").textContent).toBe("Preview ready: 2 new, 1 already there, 1 rejected");
  });
});
