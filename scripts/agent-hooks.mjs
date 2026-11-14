// What the coding agent's hooks decide, kept apart from reading the
// message and answering it, so the decisions can be tested.

import { stripVTControlCharacters } from "node:util"

// A hook message over 10,000 characters is cut. Stay under that.
const MOST_OUTPUT_SENT = 8000
// The end of the output is the summary, which names everything that failed.
const KEPT_FROM_THE_END = 2000

const FILE_REASON =
  ".env holds this computer's own keys, so only the user changes it. Ask them to make the change."

const COMMAND_REASON =
  "This command names .env, which holds this computer's own keys, so only the user changes it. A command can " +
  "change a file in too many ways to tell a read from a write, so any command that names .env is stopped. " +
  "If you need something from it or in it, ask the user."

const TRUNCATED_REASON =
  "This command was cut before the hook could read all of it, so it cannot tell whether the command names .env. Split the command and try again."

// .env as a name of its own, not part of a longer name such as .env.example or .venv.
const NAMES_ENV = /(?<![\w.-])\.env(?![\w.-])/i

const COMMAND_TOOLS = new Set(["Bash", "PowerShell", "Shell", "run_terminal_command"])

/** True for a file called .env in any folder. macOS and Windows ignore case, so .ENV is the same file. */
export function isEnvFile(filePath) {
  return filePath.split(/[\\/]/).pop().toLowerCase() === ".env"
}

function filePathOf(toolInput) {
  return toolInput.file_path ?? toolInput.path ?? toolInput.notebook_path
}

function envGuardReason(toolName, toolInput, truncated) {
  if (COMMAND_TOOLS.has(toolName)) {
    if (truncated) return TRUNCATED_REASON
    return NAMES_ENV.test(toolInput.command ?? "") ? COMMAND_REASON : null
  }
  const filePath = filePathOf(toolInput)
  return typeof filePath === "string" && isEnvFile(filePath) ? FILE_REASON : null
}

/** The PreToolUse hook's answer to a tool call. Null lets it go ahead. */
export function envGuardReply({
  tool_name: toolName,
  tool_input: toolInput = {},
  tool_input_truncated: truncated = false,
}) {
  const reason = envGuardReason(toolName, toolInput, truncated)
  if (!reason) return null
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }
}

function lastLineBreak(text) {
  const at = text.lastIndexOf("\n")
  return at === -1 ? text.length : at
}

/** Cuts whole lines from the middle of text longer than most, keeping its start and its end. */
export function shorten(text, most = MOST_OUTPUT_SENT) {
  if (text.length <= most) return text
  const note = "\n[Some output was cut here. Run npm run check:quick to see all of it.]\n"
  const start = text.slice(0, most - KEPT_FROM_THE_END - note.length)
  const end = text.slice(-KEPT_FROM_THE_END)
  return start.slice(0, lastLineBreak(start)) + note + end.slice(end.indexOf("\n") + 1)
}

function checkFailedReason(output) {
  return [
    "npm run check:quick failed. Fix what it found, then run it again to confirm.",
    "Fix the code, not the rules. If a rule doesn't suit this project, ask the user.",
    "This hook won't stop you a second time, so if something can't be fixed now, say what and why.",
    "",
    shorten(stripVTControlCharacters(output).trim()),
  ].join("\n")
}

/**
 * The Stop hook's answer when the agent finishes a turn. Null lets it stop.
 * runCheck returns { passed, output }. The hook blocks once at most: when the
 * agent is already carrying on because of it, the hook lets the agent stop
 * without checking again. A session-end stop is not a turn, so it is skipped.
 */
export function stopHookReply(event, runCheck) {
  if (event.stop_hook_active) return null
  if (event.reason && event.reason !== "end_turn") return null
  const { passed, output } = runCheck()
  return passed ? null : { decision: "block", reason: checkFailedReason(output) }
}
