import { api } from "../lib/api";

export type CopilotMessage = { role: "user" | "assistant"; content: string };

export type CopilotCall = { name: string; input: Record<string, unknown> };

export type CopilotPending = { line: string; call: CopilotCall };

export type CopilotReply = {
  tools: string[];
  answer: string;
  pending: CopilotPending | null;
  sentence: string | null;
};

export type CopilotDone = { done: boolean; sentence: string | null };

/** The question and the earlier turns, which are text. The token stays on the server. */
export function askCopilot(question: string, messages: CopilotMessage[]) {
  return api<CopilotReply>("/copilot", { method: "POST", body: { question, messages } });
}

export function confirmCopilot(call: CopilotCall) {
  return api<CopilotDone>("/copilot/confirm", { method: "POST", body: call });
}

export function cancelCopilot(call: CopilotCall) {
  return api<CopilotDone>("/copilot/cancel", { method: "POST", body: call });
}
