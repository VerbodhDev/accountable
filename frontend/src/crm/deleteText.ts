import type { ContactDetail, DealDetail, OrganizationDetail, TimelineItem } from "../lib/api"

function list(names: string[], empty: string, sentence: string): string {
  if (names.length === 0) return empty
  return `${sentence}: ${names.join(", ")}.`
}

export function organizationDeleteText(org: OrganizationDetail): string {
  const contacts = list(org.contacts.map((item) => item.name), "No contacts are linked.", "These contacts are deleted")
  const deals = list(org.deals.map((item) => item.name), "No deals are linked.", "These deals are deleted")
  return `Delete ${org.name}? ${contacts} ${deals} Their activities and stage entries are deleted too.`
}

export function contactDeleteText(contact: ContactDetail): string {
  const own = contact.timeline.filter((item) => item.kind === "activity" && item.contact_id === contact.id && !item.deal_id)
  const activities = list(
    own.map((item) => item.description || item.title),
    "No activities are linked to this contact.",
    "These activities are deleted",
  )
  const deals = list(
    contact.deals.map((item) => item.name),
    "No deal uses this main contact.",
    "These deals stay, and they lose this main contact",
  )
  return `Delete ${contact.name}? ${activities} ${deals}`
}

export function dealDeleteText(deal: DealDetail): string {
  const activities = list(
    deal.timeline.filter((item) => item.kind === "activity").map((item) => item.description || item.title),
    "No activities are linked.",
    "These activities are deleted",
  )
  const entries = list(
    deal.timeline.filter((item) => item.kind === "stage").map((item) => item.title),
    "No stage entries are linked.",
    "These stage entries are deleted",
  )
  const contact = deal.contact_name ? `${deal.contact_name} stays.` : "No main contact is set."
  return `Delete ${deal.name}? ${activities} ${entries} ${deal.organization_name} stays. ${contact}`
}

export function activityDeleteText(recordName: string): string {
  return `Delete this activity? ${recordName} stays.`
}

export function stageDeleteText(dealName: string, stage: string): string {
  return `Delete this stage entry? ${dealName} stays in ${stage}.`
}

export function timelineDeleteText(
  item: Pick<TimelineItem, "kind" | "record_name">,
  parentName: string,
  stage?: string,
): string {
  const name = item.record_name || parentName
  if (item.kind === "stage") {
    if (stage && name === parentName) return stageDeleteText(name, stage)
    return `Delete this stage entry? ${name} stays in its current stage.`
  }
  return activityDeleteText(name)
}

export function timelineDescription(item: TimelineItem): string {
  return item.description || item.detail || item.title
}
