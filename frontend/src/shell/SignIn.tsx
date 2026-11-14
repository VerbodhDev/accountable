import { useEffect, useState, type FormEvent } from "react"
import { Field } from "../crm/Dialog"
import { ApiError, api, signInWithSupabase, type PublicConfig } from "../lib/api"
import { useSession } from "./session"

export function SignIn() {
  const { accept } = useSession()
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [failed, setFailed] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [field, setField] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    api
      .config()
      .then((next) => {
        if (live) setConfig(next)
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!config) return
    setBusy(true)
    setError(undefined)
    setField(undefined)
    try {
      const user = config.supabase_url
        ? await signInWithSupabase(
            config.supabase_url,
            config.supabase_publishable_key,
            email,
            password,
          )
        : await api.signIn(email, password)
      accept(user)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setField(err.field)
      } else {
        setError("Could not load records.")
      }
    } finally {
      setBusy(false)
    }
  }

  if (failed) return <p className="panel banner">Could not load records.</p>
  if (!config) return <p>Loading records.</p>

  return (
    <main className="signin-page">
      <form className="panel signin-panel" onSubmit={(event) => void onSubmit(event)}>
        <h1>Sign in</h1>
        <Field label="Email" error={field === "email" ? error : undefined}>
          <input
            type="email"
            value={email}
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Password" error={field === "password" ? error : undefined}>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error && field !== "email" && field !== "password" ? (
          <p className="field-error">{error}</p>
        ) : null}
        <button type="submit" className="primary" disabled={busy}>
          Sign in
        </button>
      </form>
    </main>
  )
}
