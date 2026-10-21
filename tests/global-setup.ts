import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { testDatabaseUrl, testOrigin } from "./config";
declare module "vitest" {
  export interface ProvidedContext {
    apiBase: string;
    mailOutbox: string;
  }
}
async function run(args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (chunk) => {
    log += chunk;
  });
  child.stderr.on("data", (chunk) => {
    log += chunk;
  });
  const [code] = await once(child, "exit");
  if (code !== 0) throw new Error(log);
}
export async function startTestApi(origin = testOrigin) {
  const url = new URL(testDatabaseUrl);
  const database = url.pathname.slice(1);
  url.pathname = "/postgres";
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    if (
      !(
        await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [
          database,
        ])
      ).rowCount
    )
      await admin.query(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.end();
  }
  const mailbox = await mkdtemp(join(tmpdir(), "lumina-mail-test-"));
  const env = {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    FRONTEND_ORIGIN: origin,
    NODE_ENV: "development",
    PAYMENT_MODE: "demo",
    ALIPAY_APP_ID: "",
    ALIPAY_PRIVATE_KEY: "",
    ALIPAY_PUBLIC_KEY: "",
    ALIPAY_SELLER_ID: "",
    ALIPAY_NOTIFY_URL: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    SMTP_HOST: "",
    MAIL_OUTBOX_DIR: mailbox,
  };
  await run(["node_modules/prisma/build/index.js", "migrate", "deploy"], env);
  await run(
    ["node_modules/typescript/bin/tsc", "-p", "backend/tsconfig.json"],
    env,
  );
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const address = socket.address();
  if (!address || typeof address === "string")
    throw new Error("无法分配测试端口");
  const port = address.port;
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  const child = spawn(process.execPath, ["backend/dist/main.js"], {
    env: { ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const stop = async () => {
    if (child.exitCode !== null) return;
    const done = once(child, "exit");
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    await done;
    clearTimeout(timer);
    await rm(mailbox, { recursive: true, force: true });
  };
  const base = `http://127.0.0.1:${port}/api`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(output);
      try {
        if ((await fetch(`${base}/health`)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error(`测试后端启动超时\n${output}`);
    return { base, mailbox, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}

export default async function setup(project: TestProject) {
  const server = await startTestApi();
  project.provide("apiBase", server.base);
  project.provide("mailOutbox", server.mailbox);
  return server.stop;
}
