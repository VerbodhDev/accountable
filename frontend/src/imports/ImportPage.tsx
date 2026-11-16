import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";

import { PageHeader } from "../components/PageHeader";
import { ApiError } from "../lib/api";
import { money } from "../lib/money";
import { listed, plural } from "../lib/words";
import { usePreview, useSaveImport, type ImportKind, type ImportReply } from "./queries";

/** The page's own size check (I17). The backend checks again, because a request can skip the page. */
const MAX_BYTES = 2 * 1024 * 1024;
const TOO_LARGE = "This file is too large. Split it into files of 2,000 rows or fewer.";
// What the backend says for a body over its 2 MB limit (main.py, TOO_BIG). On this page it means the file is too large (I18).
const BODY_TOO_BIG = "That's too big to send.";
const CANNOT_READ = "This file could not be read.";
const IGNORED_SHOWN = 6;

const KINDS: { value: ImportKind; label: string; noun: string; list: { to: string; label: string } }[] = [
  { value: "companies", label: "Companies", noun: "company", list: { to: "/organizations", label: "Organizations" } },
  { value: "contacts", label: "Contacts", noun: "contact", list: { to: "/contacts", label: "Contacts" } },
  { value: "deals", label: "Deals", noun: "deal", list: { to: "/deals", label: "Deals" } },
];

type Chosen = { name: string; text: string };

type View =
  | { step: "empty" }
  | { step: "reading" }
  | { step: "preview"; reply: ImportReply }
  | { step: "saving"; reply: ImportReply }
  | { step: "done"; reply: ImportReply; kind: ImportKind }
  | { step: "refused"; message: string }
  | { step: "failed"; message: string };

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function nounFor(kind: ImportKind, count: number) {
  const found = KINDS.find((entry) => entry.value === kind)!;
  return plural(count, found.noun).replace(/^\d+ /, "");
}

/** What a save added, in words (I26): "Added 3 deals, 2 organizations and 1 contact. 4 were already there." */
function addedMessage(kind: ImportKind, { counts }: ImportReply) {
  const items =
    kind === "companies"
      ? [plural(counts.new, "organization")]
      : kind === "contacts"
        ? [plural(counts.new, "contact"), counts.companies_to_add && plural(counts.companies_to_add, "organization")]
        : [
            plural(counts.new, "deal"),
            counts.companies_to_add && plural(counts.companies_to_add, "organization"),
            counts.contacts_to_add && plural(counts.contacts_to_add, "contact"),
          ];
  const added = `Added ${listed(items.filter((item): item is string => Boolean(item)))}.`;
  return counts.existing > 0
    ? `${added} ${counts.existing} ${counts.existing === 1 ? "was" : "were"} already there.`
    : added;
}

function ignoredLine(names: string[]) {
  if (names.length === 0) return null;
  const shown = names.slice(0, IGNORED_SHOWN);
  const rest = names.length - shown.length;
  return `Not imported: ${rest > 0 ? `${shown.join(", ")} and ${rest} more` : listed(shown)}`;
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control bg-page px-3 py-2">
      <dt className="text-[13px] leading-[18px] text-muted">{label}</dt>
      <dd className="num text-[24px] leading-[30px] font-medium">{value}</dd>
    </div>
  );
}

function NewDeals({ reply }: { reply: ImportReply }) {
  const more = reply.counts.new - reply.deals.length;
  return (
    <>
      <table className="w-full text-left text-[14px] leading-5">
        <caption className="sr-only">New deals</caption>
        <thead>
          <tr className="text-[13px] leading-[18px] text-muted">
            <th scope="col" className="w-16 py-1 pr-3 font-semibold">
              Row
            </th>
            <th scope="col" className="py-1 pr-3 font-semibold">
              Deal
            </th>
            <th scope="col" className="py-1 pr-3 font-semibold">
              Stage
            </th>
            <th scope="col" className="py-1 font-semibold">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {reply.deals.map((deal) => (
            <tr key={deal.row}>
              <td className="num py-1 pr-3">{deal.row}</td>
              <td className="min-w-0 py-1 pr-3 break-words">{deal.name}</td>
              <td className="py-1 pr-3">{deal.stage}</td>
              <td className="num py-1">
                {money(deal.value)}
                {deal.rounded && <span className="text-muted"> (rounded from {deal.amount})</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {more > 0 && <p className="text-muted">and {more} more new deals</p>}
    </>
  );
}

function Preview({ reply, kind }: { reply: ImportReply; kind: ImportKind }) {
  const { counts } = reply;
  const ignored = ignoredLine(reply.ignored_columns);
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">
        Preview ready: {counts.new} new, {counts.existing} already there, {counts.rejected} rejected
      </p>
      <dl
        aria-label="What the file holds"
        role="group"
        className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3"
      >
        <Figure label="New" value={counts.new} />
        {kind !== "companies" && <Figure label="Companies to add" value={counts.companies_to_add} />}
        {kind === "deals" && <Figure label="Contacts to add" value={counts.contacts_to_add} />}
        <Figure label="Already there" value={counts.existing} />
        <Figure label="Rejected" value={counts.rejected} />
      </dl>
      {ignored && <p className="text-[13px] leading-[18px] text-muted">{ignored}</p>}
      {kind === "deals" && reply.deals.length > 0 && <NewDeals reply={reply} />}
      {reply.rejected.length > 0 && (
        <table className="w-full text-left text-[14px] leading-5">
          <caption className="sr-only">Rejected rows</caption>
          <thead>
            <tr className="text-[13px] leading-[18px] text-muted">
              <th scope="col" className="w-16 py-1 pr-3 font-semibold">
                Row
              </th>
              <th scope="col" className="py-1 font-semibold">
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {reply.rejected.map((row) => (
              <tr key={row.row}>
                <td className="num py-1 pr-3">{row.row}</td>
                <td className="py-1">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {reply.rejected_more > 0 && <p className="text-muted">and {reply.rejected_more} more rejected rows</p>}
    </div>
  );
}

/** The Import page (I1 to I28): choose what is in a HubSpot file and the file, look at the preview, then confirm. */
export function ImportPage() {
  const preview = usePreview();
  const save = useSaveImport();
  const [kind, setKind] = useState<ImportKind>("companies");
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [view, setView] = useState<View>({ step: "empty" });
  const picker = useRef<HTMLInputElement>(null);
  const latest = useRef(0);
  // The kind as it is now, for a file that finishes reading after the kind was changed.
  const kindNow = useRef<ImportKind>("companies");
  // A button only disables once the page redraws, which a quick second press can beat (F10).
  const saving = useRef(false);

  function failure(error: unknown): View {
    if (error instanceof ApiError && error.kind === "fields")
      return { step: "refused", message: error.fields.csv ?? error.message };
    if (error instanceof ApiError && error.message === BODY_TOO_BIG) return { step: "refused", message: TOO_LARGE };
    return { step: "failed", message: error instanceof Error ? error.message : "Something went wrong." };
  }

  async function runPreview(forKind: ImportKind, text: string) {
    const mine = ++latest.current;
    setView({ step: "reading" });
    try {
      const reply = await preview.mutateAsync({ kind: forKind, csv: text });
      if (mine === latest.current) setView({ step: "preview", reply });
    } catch (error) {
      if (mine === latest.current) setView(failure(error));
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    latest.current += 1;
    if (file.size > MAX_BYTES) {
      setChosen(null);
      setView({ step: "refused", message: TOO_LARGE });
      return;
    }
    let text: string;
    try {
      text = await readText(file);
    } catch {
      setChosen(null);
      setView({ step: "refused", message: CANNOT_READ });
      return;
    }
    setChosen({ name: file.name, text });
    await runPreview(kindNow.current, text);
  }

  function changeKind(next: ImportKind) {
    if (saving.current) return;
    kindNow.current = next;
    setKind(next);
    if (chosen) void runPreview(next, chosen.text);
    else setView({ step: "empty" });
  }

  async function confirm() {
    if (saving.current || !chosen || view.step !== "preview") return;
    saving.current = true;
    const { reply } = view;
    setView({ step: "saving", reply });
    try {
      const saved = await save.mutateAsync({ kind, csv: chosen.text });
      setView({ step: "done", reply: saved, kind });
      setChosen(null);
    } catch (error) {
      setView(failure(error));
    } finally {
      saving.current = false;
    }
  }

  function startOver() {
    latest.current += 1;
    setChosen(null);
    setView({ step: "empty" });
  }

  const previewing = view.step === "preview" || view.step === "saving";

  return (
    <>
      <PageHeader title="Import from HubSpot" />
      <div className="px-6 pb-6">
        <section aria-label="Import" className="panel flex max-w-[760px] flex-col gap-5 px-[18px] py-5">
          <p className="text-muted">
            Export a list from HubSpot as a CSV file, then choose it here. Import companies first, then contacts, then
            deals.
          </p>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] leading-[18px] font-semibold">What is in the file?</legend>
            {KINDS.map((entry) => (
              <div key={entry.value} className="flex flex-col gap-0.5">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    value={entry.value}
                    checked={kind === entry.value}
                    onChange={() => changeKind(entry.value)}
                    disabled={view.step === "saving"}
                    className="size-4 accent-sea-green"
                  />
                  {entry.label}
                </label>
                {entry.value === "deals" && (
                  <p className="pl-6 text-[13px] leading-[18px] text-muted">
                    In HubSpot's Export window, open Customize and choose All properties and all associations on
                    records, so each deal names its company and its contact.
                  </p>
                )}
              </div>
            ))}
          </fieldset>
          <div className="flex min-w-0 items-center gap-3">
            <input
              ref={picker}
              type="file"
              accept=".csv,text/csv"
              aria-label="CSV file"
              tabIndex={-1}
              className="sr-only"
              onChange={(event) => void chooseFile(event)}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={view.step === "saving"}
              onClick={() => picker.current?.click()}
            >
              Choose file
            </button>
            {chosen && <span className="min-w-0 truncate text-muted">{chosen.name}</span>}
          </div>
          <div className="flex flex-col gap-3">
            {view.step === "reading" && (
              <p role="status" className="text-muted">
                Reading the file
              </p>
            )}
            {previewing && <Preview reply={view.reply} kind={kind} />}
            {(view.step === "refused" || view.step === "failed") && (
              <p role="alert" className="text-raspberry-text">
                {view.message}
              </p>
            )}
            {view.step === "done" && (
              <div className="flex flex-col gap-3">
                <p role="status">{addedMessage(view.kind, view.reply)}</p>
                <p>
                  <Link to={KINDS.find((entry) => entry.value === view.kind)!.list.to} className="underline">
                    {KINDS.find((entry) => entry.value === view.kind)!.list.label}
                  </Link>
                </p>
              </div>
            )}
          </div>
          {previewing && (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                disabled={view.step === "saving" || view.reply.counts.new === 0}
                onClick={() => void confirm()}
              >
                {view.step === "saving"
                  ? "Importing"
                  : `Import ${view.reply.counts.new} new ${nounFor(kind, view.reply.counts.new)}`}
              </button>
              <button type="button" className="btn btn-secondary" disabled={view.step === "saving"} onClick={startOver}>
                Choose another file
              </button>
            </div>
          )}
          {view.step === "failed" && chosen && (
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary" onClick={() => void runPreview(kind, chosen.text)}>
                Try again
              </button>
            </div>
          )}
          {view.step === "done" && (
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={startOver}>
                Import another file
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
