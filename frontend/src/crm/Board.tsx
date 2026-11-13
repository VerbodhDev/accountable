import { DndContext, PointerSensor, closestCorners, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type Deal } from "../lib/api"
import { shortDate } from "../lib/format"
import { isLate, markStyle } from "./late"
import { money } from "../lib/money"
import { STAGES, STAGE_COLOR, USUAL_PROBABILITY, isOpenStage, stageInk } from "./stages"

function byPosition(left: Deal, right: Deal): number {
  return left.position - right.position || left.id - right.id
}

function dropTarget(deals: Deal[], deal: Deal, overId: string): { stage: string; position: number } | null {
  if (overId.startsWith("stage:")) {
    const stage = overId.slice("stage:".length)
    if (!STAGES.some((item) => item === stage)) return null
    return { stage, position: deals.filter((item) => item.stage === stage && item.id !== deal.id).length }
  }
  const over = deals.find((item) => item.id === Number(overId))
  if (!over) return null
  if (over.stage === deal.stage) {
    const column = deals.filter((item) => item.stage === deal.stage).sort(byPosition)
    // Same-column index includes this card, matching remove-then-insert.
    return { stage: deal.stage, position: column.findIndex((item) => item.id === over.id) }
  }
  const dest = deals.filter((item) => item.stage === over.stage && item.id !== deal.id).sort(byPosition)
  return { stage: over.stage, position: dest.findIndex((item) => item.id === over.id) }
}

function applyMove(deals: Deal[], id: number, stage: string, position: number): Deal[] {
  const next = deals.map((deal) => ({ ...deal }))
  const moving = next.find((deal) => deal.id === id)
  if (!moving) return deals
  if (moving.stage !== stage) {
    const origin = next.filter((deal) => deal.stage === moving.stage && deal.id !== id).sort(byPosition)
    origin.forEach((deal, index) => { deal.position = index })
    moving.probability = USUAL_PROBABILITY[stage] ?? moving.probability
    moving.probability_hand_set = false
    moving.expected_cents = Math.trunc((moving.value_cents * moving.probability) / 100)
  }
  const dest = next.filter((deal) => deal.stage === stage && deal.id !== id).sort(byPosition)
  const index = Math.max(0, Math.min(position, dest.length))
  moving.stage = stage
  dest.splice(index, 0, moving)
  dest.forEach((deal, itemIndex) => { deal.position = itemIndex })
  return next
}

function DealCard({ deal, today }: { deal: Deal; today: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id })
  const late = isLate(deal.stage, deal.close_date, today)
  return (
    <article
      ref={setNodeRef}
      className="card"
      data-testid={`card-${deal.name}`}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "none" }}
      {...attributes}
      {...listeners}
    >
      <h3>
        <Link to={`/deals/${deal.id}`} onPointerDown={(event) => event.stopPropagation()}>{deal.name}</Link>
        {late ? <span className="pill" style={markStyle("Late")}>Late</span> : null}
      </h3>
      <p>{deal.organization_name}</p>
      <p className="meta">
        <span>{money(deal.value_cents)}</span>
        <span>{shortDate(deal.close_date)}</span>
      </p>
    </article>
  )
}

function Column({ stage, deals, today, onAdd }: { stage: string; deals: Deal[]; today: string; onAdd: (stage: string) => void }) {
  const { setNodeRef } = useDroppable({ id: `stage:${stage}` })
  const value = deals.reduce((sum, deal) => sum + deal.value_cents, 0)
  const expected = deals.reduce((sum, deal) => sum + deal.expected_cents, 0)
  return (
    <section ref={setNodeRef} className="col" data-testid={`column-${stage}`}>
      <div className="col-name">
        <span className="chip" style={{ background: STAGE_COLOR[stage], color: stageInk(stage) }}>{stage}</span>
        <span className="count">{deals.length}</span>
      </div>
      <p className="sums"><span>Value</span><b>{money(value)}</b></p>
      <p className="sums"><span>Expected</span><b>{money(expected)}</b></p>
      <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        {deals.map((deal) => <DealCard key={deal.id} deal={deal} today={today} />)}
      </SortableContext>
      <button type="button" className="primary add" onClick={() => onAdd(stage)}>Add deal</button>
    </section>
  )
}

export function Board({
  deals,
  today,
  onReload,
  onAdd,
}: {
  deals: Deal[]
  today: string
  onReload: () => Promise<void>
  onAdd: (stage: string) => void
}) {
  const [items, setItems] = useState(deals)
  const [moveError, setMoveError] = useState("")
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => { setItems(deals) }, [deals])

  function onDragEnd(event: DragEndEvent) {
    if (!event.over) return
    const activeId = Number(event.active.id)
    const deal = items.find((item) => item.id === activeId)
    if (!deal) return
    const target = dropTarget(items, deal, String(event.over.id))
    if (!target || (target.stage === deal.stage && target.position === deal.position)) return
    const previous = items
    setItems(applyMove(items, activeId, target.stage, target.position))
    setMoveError("")
    void api.updateDeal(activeId, { stage: target.stage, position: target.position }).then(() => onReload()).catch(() => {
      setItems(previous)
      setMoveError("Could not save the move.")
    })
  }

  const open = items.filter((deal) => isOpenStage(deal.stage))
  const openCents = open.reduce((sum, deal) => sum + deal.value_cents, 0)
  const expectedCents = open.reduce((sum, deal) => sum + deal.expected_cents, 0)

  return (
    <>
      <div className="board-head panel">
        <div>
          <p className="k">Open pipeline</p>
          <p className="v" data-testid="pipeline-open">{money(openCents)}</p>
        </div>
        <div>
          <p className="k">Expected revenue</p>
          <p className="v" data-testid="pipeline-expected">{money(expectedCents)}</p>
        </div>
      </div>
      {moveError ? <p className="panel banner" role="alert">{moveError}</p> : null}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="board">
          {STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              today={today}
              onAdd={onAdd}
              deals={items.filter((deal) => deal.stage === stage).sort(byPosition)}
            />
          ))}
        </div>
      </DndContext>
    </>
  )
}
