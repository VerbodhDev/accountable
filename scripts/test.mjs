import { spawnSync } from "node:child_process"

const commands = ["uv run --group dev pytest", "npm test -w frontend", "npx playwright test"]

let code = 0
for (const command of commands) {
  const result = spawnSync(command, { stdio: "inherit", shell: true })
  if (result.status !== 0 && code === 0) code = result.status ?? 1
}
if (code !== 0) process.exit(code)
