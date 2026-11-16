import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import {
  askCopilot,
  cancelCopilot,
  confirmCopilot,
  type CopilotCall,
  type CopilotMessage,
  type CopilotReply,
} from "./queries";

const NEED_TOKEN = "The Copilot needs a token.";
const LIMIT = "The limit was reached.";
const BOX = 2000;

type Exchange = { question: string; tools: string[]; answer: string };

type Waiting = { index: number; line: string; call: CopilotCall };

function historyOf(items: Exchange[]): CopilotMessage[] {
  return items.flatMap((item) =>
    item.answer
      ? [
          { role: "user" as const, content: item.question },
          { role: "assistant" as const, content: item.answer },
        ]
      : [],
  );
}

function replacesThread(sentence: string | null): sentence is string {
  return sentence === NEED_TOKEN || sentence === LIMIT;
}

/** The top-bar button and the panel. The conversation stays while this stays mounted, panel closed included. */
export function Copilot() {
  const queryClient = useQueryClient();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [waiting, setWaiting] = useState<Waiting | null>(null);

  useEffect(() => {
    if (!open) return;
    if (waiting) confirmButton.current?.focus();
    else box.current?.focus();
  }, [open, waiting, working]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || !panel.current?.contains(event.target as Node)) return;
      event.preventDefault();
      if (waiting) void cancelCopilot(waiting.call);
      setWaiting(null);
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, waiting]);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  function onButtonClick() {
    if (open) close();
    else setOpen(true);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || working || waiting) return;
    const earlier = draft;
    setDraft("");
    setWorking(true);
    try {
      const reply = await askCopilot(question, historyOf(exchanges));
      keep(question, reply);
    } catch {
      setDraft(earlier);
    } finally {
      setWorking(false);
    }
  }

  function keep(question: string, reply: CopilotReply) {
    if (replacesThread(reply.sentence)) {
      setNotice(reply.sentence);
      return;
    }
    setNotice(null);
    const index = exchanges.length;
    setExchanges((items) => [
      ...items,
      { question, tools: reply.tools, answer: reply.pending ? "" : reply.answer || reply.sentence || "" },
    ]);
    if (reply.pending) setWaiting({ index, line: reply.pending.line, call: reply.pending.call });
  }

  async function confirm() {
    if (!waiting || working) return;
    setWorking(true);
    try {
      const reply = await confirmCopilot(waiting.call);
      const text = reply.done ? waiting.line : (reply.sentence ?? "The Copilot could not answer.");
      finish(waiting.index, text);
      if (reply.done) await queryClient.invalidateQueries();
    } catch {
      // The confirmation stays, so it can be tried again. Nothing was assumed written.
    } finally {
      setWorking(false);
    }
  }

  async function cancelWrite() {
    if (!waiting) return;
    const call = waiting.call;
    setWaiting(null);
    try {
      await cancelCopilot(call);
    } catch {
      // The write never ran, so closing still leaves the records alone.
    }
  }

  function finish(index: number, answer: string) {
    setExchanges((items) => items.map((item, place) => (place === index ? { ...item, answer } : item)));
    setWaiting(null);
  }

  function onChoiceKey(event: KeyboardEvent<HTMLButtonElement>) {
    const next = event.key === "ArrowRight" || event.key === "ArrowDown";
    const previous = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!next && !previous) return;
    event.preventDefault();
    const choices = [confirmButton.current, cancelButton.current];
    const index = choices.findIndex((choice) => choice === document.activeElement);
    const step = next ? 1 : -1;
    choices[(index + step + choices.length) % choices.length]?.focus();
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Copilot"
        aria-expanded={open}
        onClick={onButtonClick}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-cerulean text-white"
      >
        <Sparkles aria-hidden="true" size={16} />
      </button>
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Copilot"
          className="fixed top-[76px] right-5 bottom-5 z-40 flex w-[400px] flex-col rounded-panel bg-raised p-5 font-sans shadow-(--shadow-dialog)"
        >
          <h2 className="text-lg font-semibold">Copilot</h2>
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {notice ? (
              <p>{notice}</p>
            ) : (
              exchanges.map((item, index) => (
                <div key={item.question + String(index)} className="flex flex-col gap-2">
                  <p>{item.question}</p>
                  {item.tools.map((line, place) => (
                    <p key={place} className="text-muted">
                      {line}
                    </p>
                  ))}
                  {item.answer ? <p>{item.answer}</p> : null}
                  {waiting?.index === index && (
                    <div className="flex flex-col gap-3">
                      <p>{waiting.line}</p>
                      <div className="flex gap-2">
                        <button
                          ref={confirmButton}
                          type="button"
                          className="btn btn-primary"
                          onClick={() => void confirm()}
                          onKeyDown={onChoiceKey}
                        >
                          Confirm
                        </button>
                        <button
                          ref={cancelButton}
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => void cancelWrite()}
                          onKeyDown={onChoiceKey}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {working && <p>Working</p>}
          </div>
          <form onSubmit={(event) => void send(event)} className="mt-4 flex gap-2">
            <input
              ref={box}
              value={draft}
              maxLength={BOX}
              disabled={working || waiting !== null}
              placeholder="Ask about your records"
              aria-label="Ask about your records"
              onChange={(event) => setDraft(event.target.value)}
              className="input h-9 min-w-0 flex-1"
            />
            <button
              type="submit"
              disabled={working || waiting !== null}
              className={`btn ${working ? "btn-secondary" : "btn-primary"}`}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
