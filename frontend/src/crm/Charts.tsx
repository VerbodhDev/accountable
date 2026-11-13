import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { MonthPoint, OpenStage } from "../lib/api"
import { money } from "../lib/money"
import { STAGE_COLOR } from "./stages"

const axis = { fill: "#073B4C", fontSize: 12, fontFamily: "Instrument Sans, sans-serif" }
const mono = { fill: "#073B4C", fontSize: 11, fontFamily: "JetBrains Mono, ui-monospace, monospace" }

export function RevenueChart({ months }: { months: MonthPoint[] }) {
  return (
    <section className="panel">
      <h2>Revenue won</h2>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={months} margin={{ top: 24, right: 12, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#CDD8DB" />
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={mono} tickFormatter={(value) => money(Number(value))} width={108} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Line
              type="monotone"
              dataKey="cents"
              name="Revenue"
              stroke="#118AB2"
              strokeWidth={3}
              dot={{ r: 5, fill: "#06D6A0", stroke: "none" }}
              isAnimationActive={false}
            >
              <LabelList dataKey="count" position="top" fill="#073B4C" fontSize={11} fontFamily="JetBrains Mono, ui-monospace, monospace" />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Last 6 months. The number on a point is the deals won.</p>
    </section>
  )
}

export function ExpectedChart({ stages }: { stages: OpenStage[] }) {
  return (
    <section className="panel">
      <h2>Expected revenue</h2>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stages} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#CDD8DB" />
            <XAxis dataKey="stage" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={mono} tickFormatter={(value) => money(Number(value))} width={108} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Bar dataKey="expected_cents" name="Expected" isAnimationActive={false} radius={8}>
              {stages.map((stage) => (
                <Cell key={stage.stage} fill={STAGE_COLOR[stage.stage]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Open stages only. Value times probability.</p>
    </section>
  )
}

export function FunnelChart({ stages }: { stages: OpenStage[] }) {
  return (
    <section className="panel" aria-label="Value sitting in each open stage">
      <h2>Sales funnel</h2>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stages} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="stage" tick={axis} width={110} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Bar dataKey="value_cents" name="Value" isAnimationActive={false} radius={8}>
              {stages.map((stage) => (
                <Cell key={stage.stage} fill={STAGE_COLOR[stage.stage]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Value sitting in each open stage now.</p>
    </section>
  )
}
