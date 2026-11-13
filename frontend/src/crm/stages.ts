export const STAGES = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const

export const STAGE_COLOR: Record<string, string> = {
  New: "#06D6A0",
  Qualified: "#FFC145",
  Proposal: "#F78C6B",
  Negotiation: "#118AB2",
  Won: "#04614A",
  Lost: "#EF476F",
}

export const USUAL_PROBABILITY: Record<string, number> = {
  New: 10,
  Qualified: 30,
  Proposal: 50,
  Negotiation: 70,
  Won: 100,
  Lost: 0,
}

export function stageInk(stage: string): string {
  if (stage === "Negotiation" || stage === "Won" || stage === "Lost") return "#ffffff"
  return "#073B4C"
}

export function isOpenStage(stage: string): boolean {
  return stage !== "Won" && stage !== "Lost"
}
