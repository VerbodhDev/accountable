// The coding agent's PreToolUse hook: stops any edit to .env.
// See .grok/hooks/accountable.json.

import { readFileSync } from "node:fs"

import { envGuardReply } from "./agent-hooks.mjs"

const raw = JSON.parse(readFileSync(0, "utf8"))
const reply = envGuardReply({
  tool_name: raw.tool_name ?? raw.toolName,
  tool_input: raw.tool_input ?? raw.toolInput ?? {},
  tool_input_truncated: raw.tool_input_truncated ?? raw.toolInputTruncated ?? false,
})
if (reply) console.log(JSON.stringify(reply))
