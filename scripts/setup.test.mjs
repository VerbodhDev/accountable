import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LOCKFILE_MARGIN_MS,
  ROOT,
  SHARED_SETTINGS,
  afterFailedInstall,
  commandFor,
  devBackendEnv,
  devWebEnv,
  isReady,
  localEnv,
  needsInstall,
  nodeProblem,
  readOptional,
  strippedLocalEnv,
  testServerEnv,
  uvProblem,
} from "./setup.mjs";

const TOKEN = "copilot-token-shape";

describe("nodeProblem", () => {
  it("accepts Node 24 and later", () => {
    expect(nodeProblem("24.0.0")).toBeNull();
    expect(nodeProblem("26.13.0")).toBeNull();
    expect(nodeProblem("v26.13.0")).toBeNull();
  });

  it("explains an older Node and where to get a new one", () => {
    const message = nodeProblem("22.11.0");
    expect(message).toContain("Node 24 or later");
    expect(message).toContain("22.11.0");
    expect(message).toContain("https://nodejs.org");
  });
});

describe("uvProblem", () => {
  it("is happy when uv is there", () => {
    expect(uvProblem(true)).toBeNull();
  });

  it("says uv is missing and how to get it", () => {
    const message = uvProblem(false);
    expect(message).toContain("needs uv");
    expect(message).toContain("https://docs.astral.sh/uv");
  });
});

describe("needsInstall", () => {
  const base = { hasNodeModules: true, lockTime: 100_000, installedTime: 100_000 };

  it("installs when node_modules is missing", () => {
    expect(needsInstall({ ...base, hasNodeModules: false })).toBe(true);
  });

  it("installs when the hidden lockfile is missing", () => {
    expect(needsInstall({ ...base, installedTime: null })).toBe(true);
  });

  it("installs when the lockfile is more than the margin newer", () => {
    expect(needsInstall({ ...base, installedTime: base.lockTime - LOCKFILE_MARGIN_MS - 1 })).toBe(true);
  });

  it("skips on a tie", () => {
    expect(needsInstall(base)).toBe(false);
  });

  it("skips on a gap within the margin, as npm's own writes leave", () => {
    expect(needsInstall({ ...base, installedTime: base.lockTime - 0.5 })).toBe(false);
    expect(needsInstall({ ...base, installedTime: base.lockTime - LOCKFILE_MARGIN_MS })).toBe(false);
  });

  it("skips when the hidden lockfile is the newer one", () => {
    expect(needsInstall({ ...base, installedTime: base.lockTime + 5000 })).toBe(false);
  });
});

describe("afterFailedInstall", () => {
  it("warns and carries on with node_modules present", () => {
    const next = afterFailedInstall(true);
    expect(next.stop).toBe(false);
    expect(next.message).toContain("carrying on");
  });

  it("stops when there's nothing installed", () => {
    expect(afterFailedInstall(false).stop).toBe(true);
  });
});

describe("commandFor", () => {
  it("runs npm through cmd.exe on Windows", () => {
    expect(commandFor("npm", ["install"], "win32")).toEqual(["cmd.exe", ["/d", "/s", "/c", "npm", "install"]]);
  });

  it("runs commands directly elsewhere", () => {
    expect(commandFor("npm", ["install"], "darwin")).toEqual(["npm", ["install"]]);
    expect(commandFor("uv", ["sync"], "win32")).toEqual(["uv", ["sync"]]);
  });
});

describe("isReady", () => {
  const json = { "content-type": "application/json" };

  it("counts any successful reply as up", () => {
    expect(isReady(new Response("<!doctype html>", { status: 200 }))).toBe(true);
    expect(isReady(new Response("{}", { status: 200, headers: json }))).toBe(true);
  });

  it("counts the API's JSON refusal as up, since every route needs a token", () => {
    const refusal = new Response('{"detail": "Sign in to use Accountable."}', { status: 401, headers: json });
    expect(isReady(refusal)).toBe(true);
  });

  it("doesn't count a refusal that isn't the API's, or any other failure", () => {
    expect(isReady(new Response("Unauthorized", { status: 401, headers: { "content-type": "text/plain" } }))).toBe(
      false,
    );
    expect(isReady(new Response('{"detail": "Not Found"}', { status: 404, headers: json }))).toBe(false);
    expect(isReady(new Response("Bad Gateway", { status: 502 }))).toBe(false);
  });
});

describe("localEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  const shared = {
    DATABASE_URL: "postgresql://nobody@db.example/postgres",
    SUPABASE_URL: "https://project.supabase.example",
    SUPABASE_PUBLISHABLE_KEY: "publishable",
    VITE_SUPABASE_URL: "https://project.supabase.example",
    VITE_SUPABASE_PUBLISHABLE_KEY: "publishable",
  };

  it("leaves out the shared app's settings and their built-in forms, keeping everything else", () => {
    const env = localEnv({ ...shared, PATH: "/usr/bin", ACCOUNTABLE_DB: "/tmp/test.db" });
    expect(env).toEqual({ PATH: "/usr/bin", ACCOUNTABLE_DB: "/tmp/test.db" });
  });

  it("leaves them out when the shell has them", () => {
    for (const [name, value] of Object.entries(shared)) vi.stubEnv(name, value);
    const env = localEnv();
    for (const name of [...SHARED_SETTINGS, ...Object.keys(shared)]) expect(env).not.toHaveProperty(name);
    expect(env.PATH).toBe(process.env.PATH);
  });

  it("leaves them out in any case, as Windows reads them, and stops uv loading a settings file", () => {
    expect(localEnv({ database_url: "postgresql://x", Supabase_Url: "https://x", UV_ENV_FILE: "x" })).toEqual({});
  });

  it("doesn't change the environment it's given", () => {
    const given = { ...shared };
    localEnv(given);
    expect(given).toEqual(shared);
  });

  it("keeps the Copilot token, so the backend helpers can pass a shell value on", () => {
    const env = localEnv({ PATH: "/usr/bin", CLAUDE_CODE_OAUTH_TOKEN: TOKEN });
    expect(env).toEqual({ PATH: "/usr/bin", CLAUDE_CODE_OAUTH_TOKEN: TOKEN });
  });
});

describe("readOptional", () => {
  const file = `CLAUDE_CODE_OAUTH_TOKEN="${TOKEN}"\n`;

  it("takes the shell over the file", () => {
    expect(readOptional({ CLAUDE_CODE_OAUTH_TOKEN: "from-shell" }, file)).toBe("from-shell");
  });

  it("uses the file when the shell is blank or missing, and trims", () => {
    expect(readOptional({ CLAUDE_CODE_OAUTH_TOKEN: "  " }, `CLAUDE_CODE_OAUTH_TOKEN="  ${TOKEN}  "\n`)).toBe(TOKEN);
    expect(readOptional({}, file)).toBe(TOKEN);
  });

  it("is empty when neither has one", () => {
    expect(readOptional({}, "")).toBe("");
  });
});

describe("strippedLocalEnv", () => {
  it("drops the token and a stub, in any case, and keeps the rest", () => {
    const env = strippedLocalEnv({
      PATH: "/usr/bin",
      CLAUDE_CODE_OAUTH_TOKEN: TOKEN,
      claude_code_oauth_token: TOKEN,
      ACCOUNTABLE_COPILOT: "stub",
      DATABASE_URL: "postgresql://nobody@db.example/postgres",
    });
    expect(env).toEqual({ PATH: "/usr/bin" });
    expect(Object.values(env).join("\n")).not.toContain(TOKEN);
  });
});

describe("devBackendEnv", () => {
  const file = `CLAUDE_CODE_OAUTH_TOKEN="from-file"\n`;

  it("passes the token from the shell and never the stub", () => {
    const env = devBackendEnv({ PATH: "/usr/bin", CLAUDE_CODE_OAUTH_TOKEN: TOKEN, ACCOUNTABLE_COPILOT: "stub" });
    expect(env.CLAUDE_CODE_OAUTH_TOKEN).toBe(TOKEN);
    expect(env).not.toHaveProperty("ACCOUNTABLE_COPILOT");
    expect(env.PATH).toBe("/usr/bin");
  });

  it("passes the token from the file when the shell has none, and the shell wins", () => {
    expect(devBackendEnv({ PATH: "/usr/bin" }, file).CLAUDE_CODE_OAUTH_TOKEN).toBe("from-file");
    expect(devBackendEnv({ CLAUDE_CODE_OAUTH_TOKEN: "from-shell" }, file).CLAUDE_CODE_OAUTH_TOKEN).toBe("from-shell");
  });

  it("leaves the token out when neither has one", () => {
    expect(devBackendEnv({ PATH: "/usr/bin", CLAUDE_CODE_OAUTH_TOKEN: "  " })).not.toHaveProperty(
      "CLAUDE_CODE_OAUTH_TOKEN",
    );
  });
});

describe("devWebEnv", () => {
  it("gives Vite neither the token nor the stub", () => {
    const env = devWebEnv({ PATH: "/usr/bin", CLAUDE_CODE_OAUTH_TOKEN: TOKEN, ACCOUNTABLE_COPILOT: "stub" });
    expect(env).toEqual({ PATH: "/usr/bin" });
  });
});

describe("testServerEnv", () => {
  it("strips the token and sets the stub", () => {
    const env = testServerEnv({ PATH: "/usr/bin", CLAUDE_CODE_OAUTH_TOKEN: TOKEN, ACCOUNTABLE_COPILOT: "live" });
    expect(env).toEqual({ PATH: "/usr/bin", ACCOUNTABLE_COPILOT: "stub" });
  });
});

describe("where the token goes", () => {
  const source = (name) => readFileSync(path.join(ROOT, "scripts", name), "utf8");

  it("sends it only to the dev backend", () => {
    const dev = source("dev.mjs");
    expect(dev).toContain("devBackendEnv(");
    expect(dev).toContain("devWebEnv(");
    expect(dev).not.toContain("ACCOUNTABLE_COPILOT");
  });

  it("strips it from check, test, e2e, seed and empty", () => {
    expect(source("test.mjs")).toContain('from "./checks.mjs"');
    expect(source("check.mjs")).toContain('from "./checks.mjs"');
    expect(source("e2e.mjs")).toContain("runChosenEndToEnd");
    for (const name of ["checks.mjs", "data.mjs"]) {
      const text = source(name);
      expect(text, name).toContain("strippedLocalEnv(");
      expect(text, name).not.toContain("ACCOUNTABLE_COPILOT");
    }
    const servers = source("test-servers.mjs");
    expect(servers).toContain("strippedLocalEnv(");
    expect(servers).toContain("testServerEnv(");
    expect(servers).not.toContain("ACCOUNTABLE_COPILOT");
  });
});
