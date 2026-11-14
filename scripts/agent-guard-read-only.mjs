// The reviewer subagent's PreToolUse hook: lets its shell run only commands that read.
// See .grok/agents/reviewer.md.

import { readFileSync } from "node:fs"

import { readOnlyGuardReply } from "./agent-hooks.mjs"

const raw = JSON.parse(readFileSync(0, "utf8"))
const reply = readOnlyGuardReply({
  tool_name: raw.tool_name ?? raw.toolName,
  tool_input: raw.tool_input ?? raw.toolInput ?? {},
  tool_input_truncated: raw.tool_input_truncated ?? raw.toolInputTruncated ?? false,
})
if (reply) console.log(JSON.stringify(reply))
