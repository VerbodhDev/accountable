// The ui-check subagent's PreToolUse hook: blocks edits and shell commands.
// See .grok/agents/ui-check.md.

import { readFileSync } from "node:fs"

import { uiCheckGuardReply } from "./agent-hooks.mjs"

const raw = JSON.parse(readFileSync(0, "utf8"))
const reply = uiCheckGuardReply({
  tool_name: raw.tool_name ?? raw.toolName,
  tool_input: raw.tool_input ?? raw.toolInput ?? {},
})
if (reply) console.log(JSON.stringify(reply))
