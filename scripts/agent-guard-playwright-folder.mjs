// The ui-check subagent's PreToolUse hook: keeps every file a Playwright tool saves in
// .playwright-mcp/, which git ignores. See .grok/agents/ui-check.md.

import { readFileSync } from "node:fs"

import { playwrightFolderGuardReply } from "./agent-hooks.mjs"

const raw = JSON.parse(readFileSync(0, "utf8"))
const reply = playwrightFolderGuardReply({
  tool_name: raw.tool_name ?? raw.toolName,
  tool_input: raw.tool_input ?? raw.toolInput ?? {},
})
if (reply) console.log(JSON.stringify(reply))
