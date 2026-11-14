import { spawnSync } from "node:child_process"

const env = { ...process.env, PYTHONPATH: "backend" }
// A leftover shared flag would point seed at Supabase.
delete env.ACCOUNTABLE_SHARED

const result = spawnSync("uv", ["run", "--group", "dev", "python", "-m", "accountable.crm.seed"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
})

process.exit(result.status ?? 1)
