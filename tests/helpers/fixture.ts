import { randomUUID, createHash } from "node:crypto";
import { inject } from "vitest";
import { PrismaClient } from "../../backend/src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { testOrigin } from "../config";
// 每个测试创建自己的数据；结束时只删除自己的记录。
export async function fixture() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }),
  });
  const extraProductIds: string[] = [];
  const suffix = randomUUID(),
    productId = `test-${suffix}`;
  const emails = [`a-${suffix}@example.com`, `b-${suffix}@example.com`];
  const password = `Test-${randomUUID()}!`;
  await db.product.create({
    data: {
      id: productId,
      name: "Test product",
      subtitle: "测试商品",
      category: "测试",
      priceCents: 12345,
      image: "/images/tee.jpg",
      color: "白",
      description: "Test fixture",
      colors: [],
      skus: { create: { size: "M", stock: 1, priceCents: 12345 } },
    },
  });
  async function request(
    path: string,
    body?: unknown,
    cookie = "",
    method?: string,
    origin = testOrigin,
  ) {
    return fetch(`${inject("apiBase")}${path}`, {
      method: method ?? (body ? "POST" : "GET"),
      headers: {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  function cookies(response: Response) {
    return response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
  }
  async function guest() {
    return cookies(await request("/session", {}));
  }
  const orderInput = () => ({
    idempotencyKey: randomUUID(),
    items: [{ id: productId, size: "M", quantity: 1 }],
    shipping: {
      recipient: "测试用户",
      phone: "13800000000",
      email: emails[0],
      province: "测试省",
      district: "测试区",
      address: "测试地址一号",
    },
  });
  async function register(index = 0, cookie = "") {
    const response = await request(
      "/auth/register",
      { email: emails[index], name: `测试用户${index}`, password },
      cookie,
    );
    if (!response.ok) throw new Error(await response.text());
    return {
      response,
      cookie: cookies(response),
      user: (await response.json()).user,
    };
  }
  async function cleanup() {
    const rows = await db.orderItem.findMany({
      where: { productId: { in: [productId, ...extraProductIds] } },
      select: { orderId: true },
    });
    await db.order.deleteMany({
      where: { id: { in: rows.map((r) => r.orderId) } },
    });
    await db.product.deleteMany({
      where: { id: { in: [productId, ...extraProductIds] } },
    });
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.authThrottle.deleteMany({
      where: {
        key: {
          in: emails
            .flatMap((e) => [e, `RESET:${e}`, `VERIFY:${e}`])
            .map((e) => createHash("sha256").update(e).digest("hex")),
        },
      },
    });
    await db.$disconnect();
  }
  return {
    db,
    extraProductIds,
    emails,
    password,
    productId,
    request,
    cookies,
    guest,
    orderInput,
    register,
    cleanup,
  };
}
export type Fixture = Awaited<ReturnType<typeof fixture>>;
