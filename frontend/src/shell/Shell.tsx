import { useEffect, useState, type ReactNode } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { applyTheme, readTheme, type Theme } from "./theme"

const LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/organizations", label: "Organizations", end: false },
  { to: "/contacts", label: "Contacts", end: false },
  { to: "/deals", label: "Deals", end: false },
  { to: "/pipeline", label: "Pipeline", end: false },
]

export function Shell() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="wrap">
      <header className="nav">
        <span className="brand">Accountable</span>
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end}>
            {link.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="quiet theme-toggle"
          aria-pressed={theme === "dark"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          Dark mode
        </button>
      </header>
      <Outlet />
    </div>
  )
}

export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children ? <div className="page-actions">{children}</div> : null}
    </div>
  )
}

export function Missing() {
  return <p className="panel banner">This record is not here.</p>
}

export function LoadError() {
  return <p className="panel banner">Could not load records.</p>
}
