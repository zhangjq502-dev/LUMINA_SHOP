import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { fixture, type Fixture } from "../helpers/fixture";
let f: Fixture;
beforeEach(async () => {
  f = await fixture();
});
afterEach(async () => {
  await f?.cleanup();
});
describe("订单支付与履约", () => {
  it("模拟支付→管理员发货→用户确认收货，库存不重复扣减", async () => {
    const a = await f.register();
    const order = (
      await (await f.request("/orders", f.orderInput(), a.cookie)).json()
    ).order;
    const id = order.id;
    expect((await f.request(`/payments/${id}/demo`, {}, a.cookie)).ok).toBe(
      true,
    );
    expect((await f.request(`/payments/${id}/demo`, {}, a.cookie)).ok).toBe(
      true,
    );
    expect(
      (await f.db.sku.findFirstOrThrow({ where: { productId: f.productId } }))
        .stock,
    ).toBe(0);
    expect(
      (
        await f.request(
          `/admin/orders/${id}/ship`,
          { carrier: "测试快递", trackingNumber: "TEST001" },
          a.cookie,
          "PATCH",
        )
      ).status,
    ).toBe(403);
    await f.db.user.update({
      where: { id: a.user.id },
      data: { role: "ADMIN" },
    });
    expect(
      (
        await f.request(
          `/admin/orders/${id}/ship`,
          { carrier: "测试快递", trackingNumber: "TEST001" },
          a.cookie,
          "PATCH",
        )
      ).status,
    ).toBe(200);
    expect((await f.request(`/orders/${id}/confirm`, {}, a.cookie)).ok).toBe(
      true,
    );
    expect((await f.db.order.findUniqueOrThrow({ where: { id } })).status).toBe(
      "COMPLETED",
    );
  });
  it("过期订单自动释放库存且不能付款，重复检查不会多次归还", async () => {
    const a = await f.register();
    await f.db.user.update({
      where: { id: a.user.id },
      data: { role: "ADMIN" },
    });
    const id = (
      await (await f.request("/orders", f.orderInput(), a.cookie)).json()
    ).order.id;
    await f.db.order.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await f.request(`/payments/${id}/demo`, {}, a.cookie)).status).toBe(
      409,
    );
    for (let i = 0; i < 2; i++)
      expect((await f.request("/admin/orders/expire", {}, a.cookie)).ok).toBe(
        true,
      );
    expect((await f.db.order.findUniqueOrThrow({ where: { id } })).status).toBe(
      "EXPIRED",
    );
    expect(
      (await f.db.sku.findFirstOrThrow({ where: { productId: f.productId } }))
        .stock,
    ).toBe(1);
  });
  it("其他用户不能支付订单，未签名的回调不能修改订单", async () => {
    const a = await f.register(),
      b = await f.register(1);
    const id = (
      await (await f.request("/orders", f.orderInput(), a.cookie)).json()
    ).order.id;
    expect((await f.request(`/payments/${id}/demo`, {}, b.cookie)).status).toBe(
      404,
    );
    expect(
      (
        await f.request("/payments/webhook", {
          type: "checkout.session.completed",
        })
      ).ok,
    ).toBe(false);
    expect((await f.db.order.findUniqueOrThrow({ where: { id } })).status).toBe(
      "PENDING_PAYMENT",
    );
  });
});
describe("管理权限与商品维护", () => {
  it("普通用户无管理权限，管理员可以改价、补货和新增商品", async () => {
    const a = await f.register();
    expect(
      (await f.request("/admin/products", undefined, a.cookie)).status,
    ).toBe(403);
    await f.db.user.update({
      where: { id: a.user.id },
      data: { role: "ADMIN" },
    });
    expect(
      (
        await f.request(
          `/admin/products/${f.productId}`,
          { name: "新商品名", priceCents: 9999, active: false },
          a.cookie,
          "PATCH",
        )
      ).status,
    ).toBe(200);
    expect((await f.request(`/products/${f.productId}`)).status).toBe(404);
    const sku = await f.db.sku.findFirstOrThrow({
      where: { productId: f.productId },
    });
    expect(
      (
        await f.request(
          `/admin/skus/${sku.id}`,
          { addStock: 3 },
          a.cookie,
          "PATCH",
        )
      ).status,
    ).toBe(200);
    expect(
      (await f.db.sku.findUniqueOrThrow({ where: { id: sku.id } })).stock,
    ).toBe(4);
    const id = `new-${f.productId}`;
    f.extraProductIds.push(id);
    expect(
      (
        await f.request(
          "/admin/products",
          {
            id,
            name: "New product",
            subtitle: "新商品",
            category: "测试",
            priceCents: 100,
            image: "/images/tee.jpg",
            color: "白",
            description: "测试商品",
            sizes: ["S", "M"],
            stock: 10,
          },
          a.cookie,
        )
      ).status,
    ).toBe(201);
  });
});
