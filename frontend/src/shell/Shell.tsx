import { useEffect, useState, type ReactNode } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { SearchBox } from "./SearchBox"
import { useSession } from "./session"
import { applyTheme, readTheme, type Theme } from "./theme"

const LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/organizations", label: "Organizations", end: false },
  { to: "/contacts", label: "Contacts", end: false },
  { to: "/deals", label: "Deals", end: false },
  { to: "/pipeline", label: "Pipeline", end: false },
]

const CHOICES: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
]

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

export function Shell() {
  const { user, signOut } = useSession()
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system" || !globalThis.matchMedia) return
    const media = globalThis.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyTheme("system")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
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
        <div className="nav-end">
          <SearchBox />
          <div className="user-menu">
            <button type="button" className="quiet" onClick={() => setOpen((value) => !value)}>
              {initials(user?.name ?? "")}
            </button>
            {open ? (
              <div className="menu panel">
                {CHOICES.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="quiet"
                    aria-pressed={theme === choice.id}
                    onClick={() => setTheme(choice.id)}
                  >
                    {choice.label}
                  </button>
                ))}
                <button type="button" className="quiet" onClick={() => signOut()}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
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
