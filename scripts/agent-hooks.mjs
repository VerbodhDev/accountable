// What the coding agent's hooks decide, kept apart from reading the
// message and answering it, so the decisions can be tested.
// The reviewer and ui-check guards live here too.

import path from "node:path"
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
  return deny(reason)
}

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }
}

const SHELL_TOOLS = new Set(["Bash", "PowerShell", "Shell", "run_terminal_command"])

const EDIT_TOOLS = new Set([
  "Edit",
  "MultiEdit",
  "Write",
  "NotebookEdit",
  "search_replace",
  "write",
  "hashline_edit",
])

// Commands that only read, each with the flags that would let it write a file or run another program.
const READ_ONLY_COMMANDS = new Map([
  ["cat", null],
  ["cd", null],
  ["cut", null],
  ["diff", null],
  ["echo", null],
  ["grep", null],
  ["head", null],
  ["ls", null],
  ["pwd", null],
  ["tail", null],
  ["tr", null],
  ["wc", null],
  ["git", /^(--output|-O|--open-files-in-pager)/],
  ["rg", /^--pre/],
  ["sort", /^(-[a-zA-Z]*o|--output)/],
])

const READ_ONLY_GIT = new Set([
  "blame",
  "cat-file",
  "describe",
  "diff",
  "grep",
  "log",
  "ls-files",
  "ls-tree",
  "merge-base",
  "rev-list",
  "rev-parse",
  "shortlog",
  "show",
  "status",
])

// git branch with these alone lists branches. Anything else could create, rename or delete one.
const BRANCH_LISTING = new Set([
  "--show-current",
  "-a",
  "--all",
  "-r",
  "--remotes",
  "-v",
  "-vv",
  "--list",
])

const READ_ONLY_REASON =
  "The reviewer only reads, so its shell runs only commands that read: " +
  `${[...READ_ONLY_COMMANDS.keys()].join(", ")}, with git limited to ${[...READ_ONLY_GIT].join(", ")} ` +
  "and branch to list branches. They can be joined with |, && or ;, and send output to /dev/null. " +
  "Redirects into a file, $( ) and backticks are stopped, so run each command on its own and use what it " +
  "printed in the next. The read, grep and list tools work too."

const TRUNCATED_READ_REASON =
  "This command was cut before the hook could read all of it, so it cannot tell whether the command only reads. Split the command and try again."

const UI_CHECK_REASON =
  "ui-check does not change code and does not run shell commands. It reads files and uses the Playwright MCP server. Screenshots go in .playwright-mcp/."

// The pieces of a shell command line, tried in this order at each point.
const SHELL_PIECES = new RegExp(
  [
    /(?<harmless>\d?>>?(?:&\d|[ \t]*\/dev\/null(?![^\s|&;])))/,
    /(?<space>[ \t]+)/,
    /(?<separator>[|&;\n])/,
    // Plain, quoted or escaped characters, with no $( or backticks inside double quotes.
    /(?<word>(?:'[^']*'|"(?:\\.|[^"\\`$]|\$(?!\())*"|\\.|[^\s'"\\|&;<>`()])+)/,
    // Anything else: a redirect into a file, $( ), backticks, a subshell, an unclosed quote.
    /(?<other>.)/,
  ]
    .map((piece) => piece.source)
    .join("|"),
  "gs",
)

const QUOTED_OR_ESCAPED = /'([^']*)'|"((?:\\.|[^"\\])*)"|\\(.)/gs

function unquote(word) {
  return word.replace(
    QUOTED_OR_ESCAPED,
    (_, single, double, escaped) => single ?? double ?? escaped,
  )
}

/** Each simple command in a command line as its words, or null if the line holds anything else. */
function simpleCommands(line) {
  const commands = [[]]
  for (const { groups } of line.matchAll(SHELL_PIECES)) {
    if (groups.other) return null
    if (groups.separator) commands.push([])
    if (groups.word) commands.at(-1).push(unquote(groups.word))
  }
  return commands.filter((words) => words.length > 0)
}

// Skips git's own options that come before the subcommand and change nothing.
function fromGitSubcommand(args) {
  if (args[0] === "--no-pager") return fromGitSubcommand(args.slice(1))
  if (args[0] === "-C") return fromGitSubcommand(args.slice(2))
  return args
}

function gitReadsOnly(args) {
  const [subcommand, ...rest] = fromGitSubcommand(args)
  if (subcommand === "branch") return rest.every((arg) => BRANCH_LISTING.has(arg))
  return READ_ONLY_GIT.has(subcommand)
}

function commandReadsOnly([name, ...args]) {
  if (!READ_ONLY_COMMANDS.has(name)) return false
  const writingFlags = READ_ONLY_COMMANDS.get(name)
  if (writingFlags && args.some((arg) => writingFlags.test(arg))) return false
  return name !== "git" || gitReadsOnly(args)
}

/** True if every command in a shell command line only reads. */
export function readsOnly(line) {
  const commands = simpleCommands(line)
  return commands !== null && commands.every(commandReadsOnly)
}

/** The reviewer subagent's PreToolUse hook. Null lets a shell command that only reads go ahead. */
export function readOnlyGuardReply({
  tool_name: toolName,
  tool_input: toolInput = {},
  tool_input_truncated: truncated = false,
}) {
  if (!SHELL_TOOLS.has(toolName)) return null
  if (truncated) return deny(TRUNCATED_READ_REASON)
  if (readsOnly(toolInput.command ?? "")) return null
  return deny(READ_ONLY_REASON)
}

const PLAYWRIGHT_FOLDER = ".playwright-mcp/"
const PLAYWRIGHT_FOLDER_REASON =
  "Save files from the browser in .playwright-mcp/, which git ignores, with a path such as " +
  ".playwright-mcp/dashboard-light-1440.png. The Playwright tools save a bare name such as dashboard.png " +
  "in the project, where the next git add would pick it up."

/** True for a relative path inside .playwright-mcp/. */
export function isInPlaywrightFolder(filename) {
  return path.posix.normalize(filename.replaceAll("\\", "/")).startsWith(PLAYWRIGHT_FOLDER)
}

/** ui-check's PreToolUse hook. Null lets a Playwright tool go ahead, unless it would save a file elsewhere. */
export function playwrightFolderGuardReply({ tool_input: toolInput = {} }) {
  const { filename } = toolInput
  if (typeof filename !== "string" || isInPlaywrightFolder(filename)) return null
  return deny(PLAYWRIGHT_FOLDER_REASON)
}

/** ui-check's PreToolUse hook for edits and shell. Null lets a read go ahead. */
export function uiCheckGuardReply({ tool_name: toolName }) {
  if (SHELL_TOOLS.has(toolName) || EDIT_TOOLS.has(toolName)) return deny(UI_CHECK_REASON)
  return null
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
