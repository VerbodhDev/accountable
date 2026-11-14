// The coding agent's Stop hook: runs npm run check:quick when a turn ends,
// and sends any failure back to fix, once. See .grok/hooks/accountable.json.

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { stopHookReply } from "./agent-hooks.mjs"

function runQuickCheck() {
  const check = spawnSync("npm", ["run", "check:quick"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 2 ** 20,
  })
  const output = [check.stdout, check.stderr, check.error?.message].filter(Boolean).join("\n")
  return { passed: check.status === 0, output }
}

const raw = JSON.parse(readFileSync(0, "utf8"))
const reply = stopHookReply(
  {
    stop_hook_active: raw.stop_hook_active ?? raw.stopHookActive ?? false,
    reason: raw.reason,
  },
  runQuickCheck,
)
if (reply) console.log(JSON.stringify(reply))
