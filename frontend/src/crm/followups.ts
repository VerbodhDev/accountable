export type FollowUp = {
  id: number
  description: string
  follow_up_date: string | null
  done: boolean
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function byDate<T extends FollowUp>(left: T, right: T): number {
  const compared = (left.follow_up_date || "").localeCompare(right.follow_up_date || "")
  if (compared !== 0) return compared
  return left.id - right.id
}

export function splitFollowUps<T extends FollowUp>(rows: T[], today: string): { overdue: T[]; upcoming: T[] } {
  const end = addDays(today, 7)
  const open = rows.filter((row) => !row.done && row.follow_up_date)
  return {
    overdue: open.filter((row) => row.follow_up_date! < today).sort(byDate),
    upcoming: open.filter((row) => row.follow_up_date! >= today && row.follow_up_date! <= end).sort(byDate),
  }
}

export function followUpMark(followUpDate: string | null, today: string): "Overdue" | null {
  if (!followUpDate || followUpDate >= today) return null
  return "Overdue"
}
