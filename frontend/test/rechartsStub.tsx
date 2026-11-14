import type { ReactNode } from "react"

type Formatter = (value: number) => string

export function ResponsiveContainer({ children }: { children?: ReactNode }) {
  return <div>{children}</div>
}

export function LineChart({ children }: { children?: ReactNode }) {
  return <div>{children}</div>
}

export function BarChart({ children }: { children?: ReactNode }) {
  return <div>{children}</div>
}

export function CartesianGrid() {
  return null
}

export function XAxis() {
  return null
}

export function YAxis({ tickFormatter }: { tickFormatter?: Formatter }) {
  return <span>{tickFormatter?.(2500)}</span>
}

export function Tooltip({ formatter }: { formatter?: Formatter }) {
  return <span>{formatter?.(2500)}</span>
}

export function Line({ children }: { children?: ReactNode }) {
  return <div>{children}</div>
}

export function Bar({ children }: { children?: ReactNode }) {
  return <div>{children}</div>
}

export function Cell() {
  return null
}

export function LabelList() {
  return null
}
