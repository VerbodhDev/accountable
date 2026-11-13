import { spawnSync } from "node:child_process"

function run(command) {
  const result = spawnSync(command, { stdio: "inherit", shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run("uv run --group dev pytest")
run("npm test -w frontend")
run("npx playwright test")
