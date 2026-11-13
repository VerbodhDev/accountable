import { spawnSync } from "node:child_process"

const result = spawnSync(
  "uv",
  ["run", "--group", "dev", "python", "-m", "accountable.crm.seed"],
  {
    stdio: "inherit",
    env: { ...process.env, PYTHONPATH: "backend" },
    shell: process.platform === "win32",
  },
)

process.exit(result.status ?? 1)
