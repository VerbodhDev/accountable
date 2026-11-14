export const MARKS = {
  Lead: { background: "#118AB2", color: "#ffffff" },
  Qualified: { background: "#FFC145", color: "#073B4C" },
  Customer: { background: "#06D6A0", color: "#073B4C" },
  Late: { background: "#EF476F", color: "#ffffff" },
  Overdue: { background: "#EF476F", color: "#ffffff" },
} as const

export type MarkName = keyof typeof MARKS

export function markStyle(name: MarkName): { background: string; color: string } {
  return { background: MARKS[name].background, color: MARKS[name].color }
}

export function isLate(
  stage: string,
  closeDate: string | null | undefined,
  today: string,
): boolean {
  if (stage === "Won" || stage === "Lost" || !closeDate) return false
  return closeDate.slice(0, 10) < today
}
