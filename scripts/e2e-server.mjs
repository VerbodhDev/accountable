import { spawn } from "node:child_process"
import { rmSync } from "node:fs"

// Playwright treats the app as ready when Vite answers. The API must answer
// first, or the first page load has nothing to show.
rmSync("data/e2e.db", { force: true })

const children = []
let stopping = false

function start(command, env) {
  const child = spawn(command, { shell: true, stdio: "inherit", env })
  children.push(child)
  child.on("exit", (code) => {
    if (!stopping && code) stop(code)
  })
}

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM")
  }
  setTimeout(() => process.exit(code), 300)
}

process.on("SIGTERM", () => stop(0))
process.on("SIGINT", () => stop(0))

const env = { ...process.env, ACCOUNTABLE_DB: "data/e2e.db" }
// The end-to-end run stays on its own SQLite file.
delete env.ACCOUNTABLE_SHARED
start(
  "uv run --group dev uvicorn accountable.main:app --app-dir backend --host 127.0.0.1 --port 8000",
  env,
)

async function waitForApi() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/config")
      if (response.ok) return true
    } catch {
      // The API process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

const ready = await waitForApi()
if (!ready) stop(1)
else start("npm run dev -w frontend", env)
