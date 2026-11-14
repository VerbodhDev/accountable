import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

if (!existsSync(".env")) {
  console.error("The shared settings file is missing.")
  process.exit(1)
}

const env = { ...process.env, ACCOUNTABLE_SHARED: "1" }
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const body = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed
  const eq = body.indexOf("=")
  if (eq === -1) continue
  const key = body.slice(0, eq).trim()
  let value = body.slice(eq + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  if (key) env[key] = value
}

// .env wins. The deploy script writes this file and does not edit .env.
const originFile = "data/frontend-origin"
if (!env.FRONTEND_ORIGIN && existsSync(originFile)) {
  const origin = readFileSync(originFile, "utf8").trim()
  if (origin) env.FRONTEND_ORIGIN = origin
}

const child = spawn(
  "uv",
  [
    "run",
    "--group",
    "dev",
    "uvicorn",
    "accountable.main:app",
    "--app-dir",
    "backend",
    "--host",
    "127.0.0.1",
    "--port",
    "8000",
  ],
  { stdio: "inherit", env },
)

child.on("exit", (code) => process.exit(code ?? 1))
process.on("SIGINT", () => child.kill("SIGTERM"))
process.on("SIGTERM", () => child.kill("SIGTERM"))
