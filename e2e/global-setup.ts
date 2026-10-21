import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { startTestApi } from "../tests/global-setup";
import { testDatabaseUrl } from "../tests/config";
export default async function setup() {
  const api = await startTestApi("http://localhost:5188");
  // 使用构建后的 CJS 后端，避免把数据库生成代码编译成浏览器模块。
  const loadBackend = createRequire(process.cwd() + "/e2e/global-setup.ts");
  const { PrismaClient } = loadBackend(
    "../backend/dist/generated/prisma/client.js",
  );
  const { PrismaPg } = loadBackend("@prisma/adapter-pg");
  const { hashPassword } = loadBackend("../backend/dist/auth/password.js");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });
  const suffix = randomUUID();
  const email = `e2e-${suffix}@example.test`;
  const adminEmail = `e2e-admin-${suffix}@example.test`;
  const password = `E2e-${randomUUID()}!`;
  const id = `e2e-${suffix}`;
  let front: ReturnType<typeof spawn> | undefined;
  const stop = async () => {
    if (front && front.exitCode === null) {
      const exit = once(front, "exit");
      front.kill("SIGTERM");
      await exit;
    }
    try {
      await db.order.deleteMany({
        where: { items: { some: { productId: id } } },
      });
      await db.product.deleteMany({ where: { id: { in: [id, `${id}-2`] } } });
      await db.user.deleteMany({
        where: { email: { in: [email, adminEmail] } },
      });
      await db.authThrottle.deleteMany({
        where: { key: { contains: suffix } },
      });
    } finally {
      await db.$disconnect();
      await api.stop();
    }
  };
  try {
    await db.product.create({
      data: {
        id,
        name: "E2E Test Tee",
        subtitle: "端到端测试上衣",
        category: id,
        priceCents: 19900,
        image: "/images/tee.jpg",
        color: "白",
        colors: [],
        description: "独立测试数据",
        skus: { create: { size: "M", stock: 3, priceCents: 19900 } },
      },
    });
    await db.product.create({
      data: {
        id: `${id}-2`,
        name: "E2E Extra Tee",
        subtitle: "分页测试",
        category: id,
        priceCents: 29900,
        image: "/images/tee.jpg",
        color: "白",
        colors: [],
        description: "分页测试",
      },
    });
    await db.user.create({
      data: {
        email: adminEmail,
        name: "测试管理员",
        passwordHash: await hashPassword(password),
        role: "ADMIN",
      },
    });
    process.env.E2E_EMAIL = email;
    process.env.E2E_ADMIN_EMAIL = adminEmail;
    process.env.E2E_PASSWORD = password;
    process.env.E2E_PRODUCT = id;
    process.env.E2E_API = api.base.replace("127.0.0.1", "localhost");
    front = spawn(
      process.execPath,
      ["node_modules/vite/bin/vite.js", "--port", "5188"],
      {
        env: {
          ...process.env,
          VITE_API_URL: api.base.replace("127.0.0.1", "localhost"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let log = "";
    front.stdout?.on("data", (chunk) => {
      log += chunk;
    });
    front.stderr?.on("data", (chunk) => {
      log += chunk;
    });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (front.exitCode !== null) throw new Error(log);
      try {
        if ((await fetch("http://localhost:5188")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error("E2E 前端启动超时");
    return stop;
  } catch (error) {
    await stop();
    throw error;
  }
}
