import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ApiError, api, type Dashboard } from "../../lib/api"
import { shortDate } from "../../lib/format"
import { money } from "../../lib/money"
import { ExpectedChart, FunnelChart, RevenueChart } from "../Charts"
import { followUpMark, splitFollowUps } from "../followups"
import { markStyle } from "../late"
import { LoadError, PageHeading } from "../../shell/Shell"

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState(false)

  async function load() {
    try {
      setError(false)
      setData(await api.dashboard())
    } catch {
      setError(true)
    }
  }

  useEffect(() => { void load() }, [])

  async function markDone(id: number) {
    try {
      await api.updateActivity(id, { done: true })
      await load()
    } catch (caught) {
      if (caught instanceof ApiError) setError(true)
    }
  }

  const split = data ? splitFollowUps(data.tasks, data.today) : { overdue: [], upcoming: [] }

  return (
    <>
      <PageHeading title="Dashboard" />
      {error ? <LoadError /> : null}
      {data ? (
        <>
          <div className="stats">
            <Stat label="Open pipeline" value={money(data.open_pipeline_cents)} />
            <Stat label="Expected revenue" value={money(data.expected_cents)} />
            <Stat label="Revenue won this month" value={money(data.won_this_month_cents)} />
            <Stat label="Deals won this month" value={String(data.won_this_month_count)} />
            <Stat label="Overdue follow-ups" value={String(data.overdue_count)} />
          </div>
          <div className="stack">
            <RevenueChart months={data.months} />
          </div>
          <div className="split">
            <ExpectedChart stages={data.open_stages} />
            <FunnelChart stages={data.open_stages} />
          </div>
          <div className="split">
            <section className="panel">
              <h2>Recent activity</h2>
              <ul className="feed">
                {data.recent.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <span className="when">{shortDate(item.happened_at)}</span>
                    <span>
                      <strong>{item.title}</strong>{" "}
                      <Link to={item.record_type === "contact" ? `/contacts/${item.record_id}` : `/deals/${item.record_id}`}>
                        {item.record_name}
                      </Link>
                      {item.detail ? <> {item.detail}</> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel">
              <h2>Follow-ups</h2>
              <h3>Overdue</h3>
              {split.overdue.length === 0 ? <p className="empty">There are no records yet.</p> : null}
              {split.overdue.map((task) => (
                <TaskRow key={task.id} task={task} today={data.today} onDone={markDone} />
              ))}
              <h3>Upcoming</h3>
              {split.upcoming.length === 0 ? <p className="empty">There are no records yet.</p> : null}
              {split.upcoming.map((task) => (
                <TaskRow key={task.id} task={task} today={data.today} onDone={markDone} />
              ))}
            </section>
          </div>
        </>
      ) : error ? null : <p>Loading records.</p>}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="panel">
      <p className="k">{label}</p>
      <p className="v">{value}</p>
    </article>
  )
}

function TaskRow({
  task,
  today,
  onDone,
}: {
  task: Dashboard["tasks"][number]
  today: string
  onDone: (id: number) => void
}) {
  const href = task.record_type === "contact" ? `/contacts/${task.record_id}` : `/deals/${task.record_id}`
  const overdue = followUpMark(task.follow_up_date, today) === "Overdue"
  return (
    <div className="task">
      <div>
        {overdue ? <span className="pill" style={markStyle("Overdue")}>Overdue</span> : null}{" "}
        <strong>{task.description}</strong>
        <p><Link to={href}>{task.record_name}</Link>, {shortDate(task.follow_up_date)}</p>
      </div>
      <button type="button" className="primary" onClick={() => onDone(task.id)}>Mark done</button>
    </div>
  )
}
