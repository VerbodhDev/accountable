import { spawnSync } from "node:child_process"

const quick = process.argv.includes("--quick")

const commands = [
  "npx prettier --check frontend scripts e2e playwright.config.ts eslint.config.js",
  "npx eslint frontend scripts e2e playwright.config.ts eslint.config.js",
  "uv run --group dev ruff format --check backend",
  "uv run --group dev ruff check backend",
  "npx tsc --noEmit -p frontend",
  "uv run --group dev ty check",
  "gitleaks dir . --redact --no-banner",
  "gitleaks git --redact --no-banner",
  "uv run --group dev pytest --cov --cov-report=term-missing --cov-fail-under=80",
  "npm test -w frontend -- --coverage",
]

if (!quick) commands.push("npx playwright test")

let code = 0
for (const command of commands) {
  console.log(`\n$ ${command}\n`)
  const result = spawnSync(command, { stdio: "inherit", shell: true })
  if (result.error) {
    console.error(result.error.message)
    if (code === 0) code = 1
    continue
  }
  if (result.status !== 0 && code === 0) code = result.status ?? 1
}
if (code !== 0) process.exit(code)
