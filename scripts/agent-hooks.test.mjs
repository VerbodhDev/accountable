import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { describe, it } from "node:test"

import { envGuardReply, isEnvFile, shorten, stopHookReply } from "./agent-hooks.mjs"

const HERE = import.meta.dirname

function hook(script, input) {
  const run = spawnSync(process.execPath, [path.join(HERE, script)], {
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: 5000,
  })
  return { code: run.status, reply: run.stdout.trim() ? JSON.parse(run.stdout) : null }
}

const denied = (reply) => reply?.hookSpecificOutput.permissionDecision === "deny"

describe("isEnvFile", () => {
  it("knows a .env path", () => {
    for (const file of [
      ".env",
      "frontend/.env",
      "/Users/someone/projects/accountable/.env",
      "C:\\work\\accountable\\.env",
      ".ENV",
    ]) {
      assert.equal(isEnvFile(file), true)
    }
  })

  it("knows other names", () => {
    for (const file of [
      ".env.example",
      ".envrc",
      "frontend/src/env.ts",
      ".venv/bin/python",
      "my.env",
    ]) {
      assert.equal(isEnvFile(file), false)
    }
  })
})

describe("envGuardReply", () => {
  it("stops an edit tool from changing .env", () => {
    for (const tool of ["Edit", "MultiEdit", "Write", "search_replace", "write", "hashline_edit"]) {
      assert.equal(
        denied(envGuardReply({ tool_name: tool, tool_input: { file_path: "/repo/.env" } })),
        true,
      )
    }
    assert.equal(
      denied(envGuardReply({ tool_name: "write", tool_input: { path: "/repo/.env" } })),
      true,
    )
  })

  it("lets other files be edited", () => {
    assert.equal(
      envGuardReply({ tool_name: "Write", tool_input: { file_path: "/repo/.env.example" } }),
      null,
    )
    assert.equal(
      envGuardReply({
        tool_name: "search_replace",
        tool_input: { file_path: "/repo/frontend/src/App.tsx" },
      }),
      null,
    )
  })

  it("stops a command that names .env", () => {
    for (const command of [
      "echo KEY=1 >> .env",
      "cp .env.example .env",
      `sed -i '' 's/a/b/' "$CLAUDE_PROJECT_DIR/.env"`,
      "rm -f backend/../.ENV",
    ]) {
      assert.equal(denied(envGuardReply({ tool_name: "Bash", tool_input: { command } })), true)
      assert.equal(
        denied(envGuardReply({ tool_name: "run_terminal_command", tool_input: { command } })),
        true,
      )
    }
  })

  it("stops a PowerShell command too", () => {
    assert.equal(
      denied(
        envGuardReply({
          tool_name: "PowerShell",
          tool_input: { command: "Set-Content .env 'KEY=1'" },
        }),
      ),
      true,
    )
  })

  it("stops a command the hook could not read whole", () => {
    assert.equal(
      denied(
        envGuardReply({
          tool_name: "run_terminal_command",
          tool_input: { command: "echo hi" },
          tool_input_truncated: true,
        }),
      ),
      true,
    )
  })

  it("lets a command that does not name .env run", () => {
    for (const command of [
      "cat .env.example",
      "ls .venv/bin",
      "npm run check:quick",
      "git status",
    ]) {
      assert.equal(envGuardReply({ tool_name: "Bash", tool_input: { command } }), null)
      assert.equal(
        envGuardReply({ tool_name: "run_terminal_command", tool_input: { command } }),
        null,
      )
    }
  })

  it("answers through the hook script", () => {
    const blocked = hook("agent-guard-env.mjs", {
      tool_name: "search_replace",
      tool_input: { file_path: "/repo/.env" },
    })
    assert.equal(blocked.code, 0)
    assert.equal(blocked.reply.hookSpecificOutput.hookEventName, "PreToolUse")
    assert.equal(blocked.reply.hookSpecificOutput.permissionDecision, "deny")

    const camel = hook("agent-guard-env.mjs", {
      toolName: "write",
      toolInput: { file_path: "/repo/.env" },
    })
    assert.equal(camel.reply.hookSpecificOutput.permissionDecision, "deny")

    assert.deepEqual(
      hook("agent-guard-env.mjs", {
        tool_name: "write",
        tool_input: { file_path: "/repo/notes.txt" },
      }),
      {
        code: 0,
        reply: null,
      },
    )
  })
})

describe("stopHookReply", () => {
  it("lets the agent stop when the checks pass", () => {
    assert.equal(
      stopHookReply({ stop_hook_active: false }, () => ({ passed: true, output: "All passed" })),
      null,
    )
  })

  it("sends a failure back, without the color codes", () => {
    const reply = stopHookReply({ stop_hook_active: false }, () => ({
      passed: false,
      output:
        "\u001b[31mESLint\u001b[39m\n  2:9  error  'unused' is assigned a value but never used\n",
    }))
    assert.equal(reply.decision, "block")
    assert.ok(reply.reason.includes("npm run check:quick failed"))
    assert.ok(reply.reason.includes("2:9  error  'unused' is assigned a value but never used"))
    assert.equal(reply.reason.includes("\u001b"), false)
  })

  it("blocks only once", () => {
    let calls = 0
    const runCheck = () => {
      calls += 1
      return { passed: false, output: "Still failing" }
    }
    assert.equal(stopHookReply({ stop_hook_active: true }, runCheck), null)
    assert.equal(calls, 0)
  })

  it("skips a session-end stop", () => {
    let calls = 0
    const runCheck = () => {
      calls += 1
      return { passed: false, output: "no" }
    }
    assert.equal(stopHookReply({ stop_hook_active: false, reason: "shutdown" }, runCheck), null)
    assert.equal(calls, 0)
  })

  it("lets the agent stop through the hook script once it has been sent back", () => {
    assert.deepEqual(
      hook("agent-check-on-stop.mjs", { hook_event_name: "Stop", stopHookActive: true }),
      {
        code: 0,
        reply: null,
      },
    )
  })
})

describe("shorten", () => {
  it("leaves short output alone", () => {
    assert.equal(shorten("Summary\n  ESLint  FAILED", 100), "Summary\n  ESLint  FAILED")
  })

  it("cuts whole lines from the middle", () => {
    const lines = Array.from({ length: 2000 }, (_, i) => `line ${i}`)
    const output = ["first problem", ...lines, "Summary: ESLint FAILED"].join("\n")
    const short = shorten(output, 8000)
    assert.ok(short.length <= 8000)
    assert.ok(short.startsWith("first problem\n"))
    assert.ok(short.endsWith("\nSummary: ESLint FAILED"))
    assert.match(short, /Run npm run check:quick to see all of it/)
  })
})
