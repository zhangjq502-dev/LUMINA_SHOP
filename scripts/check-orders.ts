import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const id = `integration-${randomUUID()}`;
const orderIds = new Set<string>();
async function session() {
  const r = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { Origin: base },
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie")!.split(";")[0];
}
async function main() {
  await db.product.create({
    data: {
      id,
      name: "Integration test",
      subtitle: "测试商品",
      category: "测试",
      priceCents: 12345,
      image: "/images/tee.jpg",
      color: "白",
      description: "Integration fixture",
      colors: [],
      skus: { create: { size: "M", stock: 1, priceCents: 12345 } },
    },
  });
  const cookie = await session(),
    other = await session();
  const input = {
    idempotencyKey: randomUUID(),
    items: [{ id, size: "M", quantity: 1 }],
    shipping: {
      recipient: "测试用户",
      phone: "13800000000",
      email: "test@example.com",
      province: "测试省",
      district: "测试区",
      address: "测试地址一号",
    },
  };
  async function post(body: unknown) {
    return fetch(`${base}/api/orders`, {
      method: "POST",
      headers: {
        Origin: base,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
  assert.equal(
    (await post({ ...input, totalCents: 1 })).status,
    400,
    "client price must be rejected",
  );
  assert.equal(
    (await post({ ...input, items: [{ id, size: "M", quantity: 0 }] })).status,
    400,
  );
  assert.equal(
    (await post({ ...input, items: [{ id, size: "invalid", quantity: 1 }] }))
      .status,
    400,
  );
  assert.equal(
    (await db.sku.findFirstOrThrow({ where: { productId: id } })).stock,
    1,
    "invalid requests preserve stock",
  );
  const responses = await Promise.all([post(input), post(input)]);
  const results = await Promise.all(responses.map((r) => r.json()));
  for (let i = 0; i < results.length; i++) {
    assert.equal(responses[i].status, 201, JSON.stringify(results[i]));
    orderIds.add(results[i].order.id);
  }
  assert.equal(orderIds.size, 1, "concurrent retries create exactly one order");
  const order = results[0].order;
  assert.equal(order.totalCents, 12345);
  assert.equal(order.status, "PENDING_PAYMENT");
  assert.equal(
    (await db.sku.findFirstOrThrow({ where: { productId: id } })).stock,
    0,
  );
  const retry = await post(input);
  assert.equal(retry.status, 201);
  assert.equal((await retry.json()).order.id, order.id);
  assert.equal(
    (
      await post({
        ...input,
        shipping: { ...input.shipping, recipient: "changed" },
      })
    ).status,
    409,
    "idempotency conflict must fail",
  );
  assert.equal(
    (await post({ ...input, idempotencyKey: randomUUID() })).status,
    409,
    "overselling must fail",
  );
  assert.equal(
    (
      await fetch(`${base}/api/orders/${order.id}`, {
        headers: { Cookie: other },
      })
    ).status,
    404,
    "other guest cannot read order",
  );
  const owned = await fetch(`${base}/api/orders`, {
    headers: { Cookie: cookie },
  });
  assert(
    (await owned.json()).orders.some((o: { id: string }) => o.id === order.id),
  );
  for (let i = 0; i < 2; i++) {
    const cancelled = await fetch(`${base}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: {
        Origin: base,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "cancel" }),
    });
    assert.equal(cancelled.status, 200);
    assert.equal((await cancelled.json()).order.status, "CANCELLED");
  }
  assert.equal(
    (await db.sku.findFirstOrThrow({ where: { productId: id } })).stock,
    1,
    "cancel restores stock once",
  );
  // Two different checkout requests must not buy the last unit twice.
  const race = await Promise.all([
    post({ ...input, idempotencyKey: randomUUID() }),
    post({ ...input, idempotencyKey: randomUUID() }),
  ]);
  assert.deepEqual(race.map((r) => r.status).sort(), [201, 409]);
  for (const response of race) {
    const data = await response.json();
    if (data.order) orderIds.add(data.order.id);
  }
  console.log(
    "PASS: server pricing, validation, stock, concurrent idempotency, ownership, cancellation, oversell prevention",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const fixtureOrders = await db.orderItem.findMany({
      where: { productId: id },
      select: { orderId: true },
    });
    await db.order.deleteMany({
      where: { id: { in: fixtureOrders.map((i) => i.orderId) } },
    });
    await db.product.deleteMany({ where: { id } });
    await db.$disconnect();
  });
