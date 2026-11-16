import { useMutation } from "@tanstack/react-query";

import { api } from "../lib/api";
import { useWrite } from "../lib/records";

export type ImportKind = "companies" | "contacts" | "deals";

/** What the backend says about a file: the counts, the rejected rows and the columns it left out (I24). */
export type ImportReply = {
  /** The first new deals, with each stage and amount as it will be saved (I24). Empty for companies and contacts. */
  deals: { row: number; name: string; stage: string; value: number; amount: string; rounded: boolean }[];
  counts: { new: number; existing: number; rejected: number; companies_to_add: number; contacts_to_add: number };
  rejected: { row: number; reason: string }[];
  rejected_more: number;
  ignored_columns: string[];
  saved: boolean;
};

type Send = { kind: ImportKind; csv: string };

/** A preview reads the file and writes nothing, so it leaves every list as it is. */
export function usePreview() {
  return useMutation({
    mutationFn: ({ kind, csv }: Send) =>
      api<ImportReply>(`/imports/${kind}`, { method: "POST", body: { csv, save: false } }),
  });
}

/** A save, after which everything is read again, so the lists show what was added. */
export function useSaveImport() {
  return useWrite(({ kind, csv }: Send) =>
    api<ImportReply>(`/imports/${kind}`, { method: "POST", body: { csv, save: true } }),
  );
}
