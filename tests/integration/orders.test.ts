import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { fixture, type Fixture } from "../helpers/fixture";
let f: Fixture;
beforeEach(async () => {
  f = await fixture();
});
afterEach(async () => {
  await f?.cleanup();
});
const stock = async () =>
  (await f.db.sku.findFirstOrThrow({ where: { productId: f.productId } }))
    .stock;
describe("订单与库存事务", () => {
  it("商品接口返回数据库内容，提交订单时使用服务端价格", async () => {
    const response = await f.request(`/products/${f.productId}`);
    expect((await response.json()).product.price).toBe(123.45);
    const cookie = await f.guest();
    const input = f.orderInput();
    expect(
      (await f.request("/orders", { ...input, totalCents: 1 }, cookie)).status,
    ).toBe(400);
    const order = await f.request("/orders", input, cookie);
    expect(order.status).toBe(201);
    expect((await order.json()).order.totalCents).toBe(12345);
    expect(await stock()).toBe(0);
  });
  it("拒绝无效数量和规格，整笔失败时库存回滚", async () => {
    const cookie = await f.guest(),
      input = f.orderInput();
    expect(
      (
        await f.request(
          "/orders",
          { ...input, items: [{ id: f.productId, size: "M", quantity: 0 }] },
          cookie,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await f.request(
          "/orders",
          {
            ...input,
            items: [
              ...input.items,
              { id: "zz-missing", size: "M", quantity: 1 },
            ],
          },
          cookie,
        )
      ).status,
    ).toBe(400);
    expect(await stock()).toBe(1);
    expect(
      await f.db.orderItem.count({ where: { productId: f.productId } }),
    ).toBe(0);
  });
  it("并发重复提交只创建一笔订单，内容不同的重复编号被拒绝", async () => {
    const cookie = await f.guest(),
      input = f.orderInput();
    const responses = await Promise.all([
      f.request("/orders", input, cookie),
      f.request("/orders", input, cookie),
    ]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    const values = await Promise.all(responses.map((r) => r.json()));
    expect(values[0].order.id).toBe(values[1].order.id);
    expect(await stock()).toBe(0);
    expect(
      (
        await f.request(
          "/orders",
          { ...input, shipping: { ...input.shipping, recipient: "changed" } },
          cookie,
        )
      ).status,
    ).toBe(409);
  });
  it("抢购最后一件商品时，只有一笔订单成功", async () => {
    const cookie = await f.guest();
    const responses = await Promise.all([
      f.request("/orders", f.orderInput(), cookie),
      f.request("/orders", f.orderInput(), cookie),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stock()).toBe(0);
  });
  it("其他访客无权查询或取消，重复取消仅归还一次库存", async () => {
    const cookie = await f.guest(),
      other = await f.guest();
    const order = (
      await (await f.request("/orders", f.orderInput(), cookie)).json()
    ).order;
    expect(
      (await f.request(`/orders/${order.id}`, undefined, other)).status,
    ).toBe(404);
    expect(
      (
        await f.request(
          `/orders/${order.id}`,
          { action: "cancel" },
          other,
          "PATCH",
        )
      ).status,
    ).toBe(404);
    for (let i = 0; i < 2; i++)
      expect(
        (
          await f.request(
            `/orders/${order.id}`,
            { action: "cancel" },
            cookie,
            "PATCH",
          )
        ).status,
      ).toBe(200);
    expect(await stock()).toBe(1);
  });
});
