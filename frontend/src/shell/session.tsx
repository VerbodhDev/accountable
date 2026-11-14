import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { setAuthToken, setUnauthorizedHandler, type SessionUser } from "../lib/api"

const SESSION_KEY = "accountable-session"

function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SessionUser>
    if (!parsed.token || !parsed.name || !parsed.email) return null
    return { token: parsed.token, name: parsed.name, email: parsed.email }
  } catch {
    return null
  }
}

function writeSession(user: SessionUser | null) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // This visit still follows the choice when storage is blocked.
  }
}

type Session = {
  user: SessionUser | null
  accept: (user: SessionUser) => void
  signOut: () => void
}

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const stored = readSession()
    setAuthToken(stored?.token ?? null)
    return stored
  })

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthToken(null)
      writeSession(null)
      setUser(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo<Session>(
    () => ({
      user,
      accept(next) {
        setAuthToken(next.token)
        writeSession(next)
        setUser(next)
      },
      signOut() {
        setAuthToken(null)
        writeSession(null)
        setUser(null)
      },
    }),
    [user],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): Session {
  const value = useContext(SessionContext)
  if (!value) throw new Error("Sign in")
  return value
}
