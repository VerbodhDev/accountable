import { spawn } from "node:child_process"

const children = []

const env = { ...process.env }
// A leftover shared flag would point this local run at Supabase.
delete env.ACCOUNTABLE_SHARED

function start(command) {
  const child = spawn(command, {
    stdio: "inherit",
    shell: true,
    env,
  })
  children.push(child)
  child.on("exit", (code) => {
    if (code) shutdown(code)
  })
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM")
  }
  process.exit(code)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

start(
  "uv run --group dev uvicorn accountable.main:app --app-dir backend --host 127.0.0.1 --port 8000",
)
start("npm run dev -w frontend")
