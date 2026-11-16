import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { holdSaves, mockApi, renderApp, user } from "../test-utils";
import { Copilot } from "./Copilot";

const ANSWER = "See https://example.com/deals";
const LINE = "Move Oakhaven Care's Payroll integration deal to Qualified";
const CALL = { name: "move_deal", input: { deal_id: 4, stage: "qualified" } };

const READ = {
  tools: ["Looking up deals closing this month"],
  answer: ANSWER,
  pending: null,
  sentence: null,
};

const MOVE = {
  tools: ["Looking up deals"],
  answer: "",
  pending: { line: LINE, call: CALL },
  sentence: null,
};

function open() {
  renderApp(<Copilot />);
  return screen.getByRole("button", { name: "Copilot" });
}

async function ask(question: string) {
  await user().click(open());
  await user().type(screen.getByRole("textbox", { name: "Ask about your records" }), question);
  await user().click(screen.getByRole("button", { name: "Send" }));
}

describe("the Copilot panel", () => {
  beforeEach(() => {
    mockApi({
      "POST /copilot": READ,
      "POST /copilot/confirm": { done: true, sentence: null },
      "POST /copilot/cancel": { done: false, sentence: null },
    });
  });

  it("opens from the Cerulean button", async () => {
    const button = open();
    expect(button.className).toContain("bg-cerulean");
    expect(button.className).toContain("h-8");
    expect(button.className).toContain("w-8");
    expect(screen.queryByRole("dialog")).toBeNull();
    await user().click(button);
    const panel = screen.getByRole("dialog", { name: "Copilot" });
    expect(panel.className).toContain("w-[400px]");
    expect(panel.className).toContain("rounded-panel");
    expect(panel.className).toContain("bg-raised");
    expect(panel.className).toContain("z-40");
    expect(panel.className).not.toContain("border");
    expect(screen.getByRole("heading", { name: "Copilot" })).toBeTruthy();
  });

  it("shows a tool line and an answer, and keeps a link as text", async () => {
    await ask("Which deals close this month?");
    expect(await screen.findByText("Looking up deals closing this month")).toBeTruthy();
    expect(screen.getByText(ANSWER).tagName).toBe("P");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows Confirm and Cancel as buttons, and Confirm is the primary button", async () => {
    mockApi({ "POST /copilot": MOVE, "POST /copilot/confirm": { done: true, sentence: null } });
    await ask("Move Payroll integration to Qualified");
    const confirm = await screen.findByRole("button", { name: "Confirm" });
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(confirm.tagName).toBe("BUTTON");
    expect(cancel.tagName).toBe("BUTTON");
    expect(confirm.className).toContain("btn-primary");
    expect(cancel.className).toContain("btn-secondary");
    expect(screen.getByText(LINE)).toBeTruthy();
  });

  it("moves between Confirm and Cancel with the arrow keys", async () => {
    mockApi({ "POST /copilot": MOVE });
    await ask("Move Payroll integration to Qualified");
    const confirm = await screen.findByRole("button", { name: "Confirm" });
    await waitFor(() => expect(document.activeElement).toBe(confirm));
    await user().keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("writes nothing until Confirm, then asks the board to refresh", async () => {
    const calls = mockApi({
      "POST /copilot": MOVE,
      "POST /copilot/confirm": { done: true, sentence: null },
    });
    const { client } = renderApp(<Copilot />);
    const refresh = vi.spyOn(client, "invalidateQueries");
    await user().click(screen.getByRole("button", { name: "Copilot" }));
    await user().type(screen.getByRole("textbox", { name: "Ask about your records" }), "Move it");
    await user().click(screen.getByRole("button", { name: "Send" }));
    expect(calls.map((call) => call.path)).toEqual(["/copilot"]);
    await user().click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(LINE)).toBeTruthy();
    await waitFor(() => expect(calls.map((call) => call.path)).toEqual(["/copilot", "/copilot/confirm"]));
    expect(calls[1].body).toEqual(CALL);
    expect(refresh).toHaveBeenCalled();
  });

  it("closes with Escape, cancels a pending write, and puts focus back on the button", async () => {
    const calls = mockApi({ "POST /copilot": MOVE, "POST /copilot/cancel": { done: false, sentence: null } });
    const button = open();
    await user().click(button);
    await user().type(screen.getByRole("textbox", { name: "Ask about your records" }), "Move it");
    await user().click(screen.getByRole("button", { name: "Send" }));
    await screen.findByRole("button", { name: "Confirm" });
    await user().keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
    await waitFor(() => expect(calls.map((call) => call.path)).toContain("/copilot/cancel"));
  });

  it("keeps the conversation while the panel is closed, and a new mount starts empty", async () => {
    const button = open();
    await user().click(button);
    await user().type(screen.getByRole("textbox", { name: "Ask about your records" }), "Which deals?");
    await user().click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(ANSWER)).toBeTruthy();
    await user().click(button);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user().click(button);
    expect(screen.getByText(ANSWER)).toBeTruthy();
  });

  it("starts empty after the panel's component is mounted again", async () => {
    const view = renderApp(<Copilot />);
    await user().click(screen.getByRole("button", { name: "Copilot" }));
    await user().type(screen.getByRole("textbox", { name: "Ask about your records" }), "Which deals?");
    await user().click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(ANSWER)).toBeTruthy();
    view.unmount();
    renderApp(<Copilot />);
    await user().click(screen.getByRole("button", { name: "Copilot" }));
    expect(screen.queryByText(ANSWER)).toBeNull();
    expect(screen.getByRole("textbox", { name: "Ask about your records" })).toBeTruthy();
  });

  it.each(["The Copilot needs a token.", "The limit was reached."])(
    "shows %s in place of the conversation and leaves the box",
    async (sentence) => {
      mockApi({ "POST /copilot": { tools: [], answer: "", pending: null, sentence } });
      await ask("Which deals close this month?");
      expect(await screen.findByText(sentence)).toBeTruthy();
      expect(screen.queryByText("Which deals close this month?")).toBeNull();
      const box = screen.getByRole("textbox", { name: "Ask about your records" });
      expect((box as HTMLInputElement).maxLength).toBe(2000);
    },
  );

  it("says Working and quiets Send while the answer is on its way", async () => {
    const release = holdSaves();
    await user().click(open());
    await user().type(screen.getByRole("textbox", { name: "Ask about your records" }), "Hello");
    await user().click(screen.getByRole("button", { name: "Send" }));
    const send = screen.getByRole("button", { name: "Send" });
    expect(screen.getByText("Working")).toBeTruthy();
    expect(send.className).toContain("btn-secondary");
    expect((send as HTMLButtonElement).disabled).toBe(true);
    release();
    expect(await screen.findByText(ANSWER)).toBeTruthy();
  });
});
