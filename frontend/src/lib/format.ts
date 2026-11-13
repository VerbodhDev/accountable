const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const parts = iso.slice(0, 10).split("-")
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (!parts[0] || month < 1 || month > 12 || !day) return ""
  return `${MONTHS[month - 1]} ${day}`
}

export function websiteHref(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
  return `https://${value}`
}
