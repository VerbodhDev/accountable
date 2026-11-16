// npm run dev: setup, port check, both servers, then the address.
// The two servers are started directly. One shared environment would hand the Copilot token to Vite.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ROOT, devBackendEnv, devWebEnv, setup, start, stopIfTaken, waitUntilReady } from "./setup.mjs";

const webPort = Number(process.env.ACCOUNTABLE_WEB_PORT ?? 5173);
const apiPort = Number(process.env.ACCOUNTABLE_API_PORT ?? 8765);
const READY_TIMEOUT_MS = 60_000;

setup();
await stopIfTaken(webPort);
await stopIfTaken(apiPort);

const envFile = path.join(ROOT, ".env");
const envFileText = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
const ports = {
  ACCOUNTABLE_WEB_PORT: String(webPort),
  ACCOUNTABLE_API_PORT: String(apiPort),
};

const backend = start(
  "uv",
  [
    "run",
    "--no-sync",
    "uvicorn",
    "accountable.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    String(apiPort),
    "--log-level",
    "warning",
  ],
  { env: { ...devBackendEnv(process.env, envFileText), ...ports } },
);

const web = start(
  process.execPath,
  [path.join(ROOT, "node_modules", "vite", "bin", "vite.js"), path.join(ROOT, "frontend"), "--logLevel", "warn"],
  { env: { ...devWebEnv(process.env), ...ports } },
);

let running = true;

function ended(code) {
  if (!running) return;
  running = false;
  backend.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exit(code ?? 0);
}

backend.on("exit", ended);
web.on("exit", ended);

// Ctrl+C reaches every process in the window on Mac and Linux, but a signal sent
// to this process alone would not, so pass it on and wait for the servers to go.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    backend.kill(signal);
    web.kill(signal);
  });
}

const addresses = [`http://127.0.0.1:${apiPort}/api/meta`, `http://127.0.0.1:${webPort}/`];
if (await waitUntilReady(addresses, () => running, READY_TIMEOUT_MS)) {
  console.log(`\nAccountable is running at http://localhost:${webPort}`);
  console.log("Keep this window open while you use it. Press Ctrl+C to stop.\n");
} else if (running) {
  console.error("Accountable didn't start in time.");
  backend.kill("SIGTERM");
  web.kill("SIGTERM");
}
