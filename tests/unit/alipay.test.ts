import { generateKeyPairSync, createSign } from "node:crypto";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  AlipayGateway,
  ALIPAY_SANDBOX_GATEWAY,
  yuanToCents,
} from "../../backend/src/payments/alipay.gateway";
import { AlipayService } from "../../backend/src/payments/alipay.service";
import { PaymentGateway } from "../../backend/src/payments/payment.gateway";
import { OrdersService } from "../../backend/src/orders/orders.service";
import type { PrismaService } from "../../backend/src/database/prisma.service";
const app = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const platform = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
beforeEach(() => {
  vi.stubEnv("PAYMENT_MODE", "alipay");
  vi.stubEnv("ALIPAY_APP_ID", "test_app");
  vi.stubEnv("ALIPAY_SELLER_ID", "test_seller");
  vi.stubEnv("ALIPAY_PRIVATE_KEY", app.privateKey);
  vi.stubEnv("ALIPAY_PUBLIC_KEY", platform.publicKey);
  vi.stubEnv(
    "ALIPAY_NOTIFY_URL",
    "https://example.test/api/payments/alipay/notify",
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
function notification(changes: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    app_id: "test_app",
    seller_id: "test_seller",
    out_trade_no: "LM_TEST",
    trade_no: "trade_1",
    total_amount: "12.34",
    trade_status: "TRADE_SUCCESS",
    ...changes,
  };
  const content = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("&");
  return {
    ...fields,
    sign_type: "RSA2",
    sign: createSign("RSA-SHA256")
      .update(content)
      .sign(platform.privateKey, "base64"),
  };
}
it("生成官方沙箱签名链接，金额包含服务端总额和固定支付截止时间", () => {
  const gateway = new AlipayGateway();
  const url = new URL(
    gateway.page("LM_TEST", 1234, new Date(Date.now() + 1800000), "order"),
  );
  expect(url.origin + url.pathname).toBe(ALIPAY_SANDBOX_GATEWAY);
  expect(url.searchParams.get("method")).toBe("alipay.trade.page.pay");
  const biz = JSON.parse(url.searchParams.get("biz_content")!);
  expect(biz.total_amount).toBe("12.34");
  expect(biz.out_trade_no).toBe("LM_TEST");
  expect(biz.time_expire).toMatch(/^\d{4}-\d{2}-\d{2} /);
  expect(url.searchParams.get("notify_url")).toBe(
    "https://example.test/api/payments/alipay/notify",
  );
  expect(new PaymentGateway(gateway).mode()).toBe("alipay");
});
it("验签拒绝金额篡改、错误应用/商户、重复字段和无效金额", () => {
  const gateway = new AlipayGateway();
  expect(gateway.verify(notification()).amount).toBe(1234);
  expect(() =>
    gateway.verify({ ...notification(), total_amount: "0.01" }),
  ).toThrow();
  expect(() => gateway.verify(notification({ app_id: "other" }))).toThrow();
  expect(() => gateway.verify(notification({ seller_id: "other" }))).toThrow();
  expect(() =>
    gateway.verify({ ...notification(), app_id: ["test_app", "other"] }),
  ).toThrow();
  for (const value of ["1e3", "NaN", "-1", "0", "1.234", "12元"])
    expect(() => yuanToCents(value)).toThrow();
  expect(yuanToCents("0.01")).toBe(1);
});
it("查单始终启用响应验签；不接受其他商户或订单的响应", async () => {
  const gateway = new AlipayGateway();
  const exec = vi.spyOn(gateway.sdk(), "exec").mockResolvedValue({
    code: "10000",
    outTradeNo: "LM_TEST",
    tradeStatus: "TRADE_SUCCESS",
    totalAmount: "12.34",
  });
  expect(await gateway.query("LM_TEST")).toEqual({
    status: "TRADE_SUCCESS",
    amount: 1234,
  });
  expect(exec).toHaveBeenCalledWith(
    "alipay.trade.query",
    { bizContent: { outTradeNo: "LM_TEST" } },
    { validateSign: true },
  );
  exec.mockResolvedValue({
    code: "10000",
    outTradeNo: "other",
    tradeStatus: "TRADE_SUCCESS",
    totalAmount: "12.34",
  });
  await expect(gateway.query("LM_TEST")).rejects.toThrow();
});
it("链接已发出而交易尚未创建时，不提前允许取消释放库存", async () => {
  const gateway = new AlipayGateway();
  const exec = vi
    .spyOn(gateway.sdk(), "exec")
    .mockResolvedValue({ code: "40004", subCode: "ACQ.TRADE_NOT_EXIST" });
  await expect(
    gateway.close("LM_TEST", new Date(Date.now() + 100000)),
  ).rejects.toMatchObject({ status: 409 });
  expect(
    (await gateway.close("LM_TEST", new Date(Date.now() - 1000)))
      .payment_status,
  ).toBe("unpaid");
  expect(exec.mock.calls.every((call) => call[2]?.validateSign)).toBe(true);
});
it("关闭交易时如果发现已经付款，返回已支付状态而非释放库存", async () => {
  const gateway = new AlipayGateway();
  vi.spyOn(gateway.sdk(), "exec").mockResolvedValue({
    code: "10000",
    outTradeNo: "LM_TEST",
    tradeStatus: "TRADE_SUCCESS",
    totalAmount: "12.34",
  });
  expect(
    await new PaymentGateway(gateway).close("alipay:LM_TEST"),
  ).toMatchObject({ payment_status: "paid", amount_total: 1234 });
});
it("通知只给绑定支付宝的同金额订单入账，重复通知不会重复更新订单", async () => {
  const order = {
    id: "order",
    number: "LM_TEST",
    paymentSessionId: "alipay:LM_TEST",
    totalCents: 1234,
    status: "PENDING_PAYMENT",
  };
  const update = vi.fn(() => {
    order.status = "PAID";
    return { count: 1 };
  });
  const db = {
    order: { findUnique: vi.fn(() => order), updateMany: update },
  } as unknown as PrismaService;
  const orders = new OrdersService(db, new PaymentGateway());
  const service = new AlipayService(db, new AlipayGateway(), orders);
  await service.notify(notification());
  await service.notify(notification());
  expect(update).toHaveBeenCalledOnce();
  await expect(
    service.notify(notification({ total_amount: "0.01" })),
  ).rejects.toThrow();
  await service.notify(notification({ trade_status: "WAIT_BUYER_PAY" }));
  expect(update).toHaveBeenCalledOnce();
});
it("下单使用数据库金额并拒绝越权、过期和其他支付渠道", async () => {
  const order = {
    id: "order",
    number: "LM_TEST",
    paymentSessionId: null as string | null,
    totalCents: 1234,
    status: "PENDING_PAYMENT",
    expiresAt: new Date(Date.now() + 1800000),
  };
  const db = {
    order: {
      findFirst: vi.fn(() => order),
      updateMany: vi.fn(() => ({ count: 1 })),
    },
  } as unknown as PrismaService;
  const gateway = new AlipayGateway();
  const service = new AlipayService(db, gateway, {} as OrdersService);
  expect(
    JSON.parse(
      new URL(
        (await service.checkout("order", { userId: "user" })).url,
      ).searchParams.get("biz_content")!,
    ).total_amount,
  ).toBe("12.34");
  order.paymentSessionId = "cs_other";
  await expect(
    service.checkout("order", { userId: "user" }),
  ).rejects.toMatchObject({ status: 409 });
  order.paymentSessionId = null;
  order.expiresAt = new Date(0);
  await expect(
    service.checkout("order", { userId: "user" }),
  ).rejects.toMatchObject({ status: 409 });
  vi.mocked(db.order.findFirst).mockResolvedValue(null);
  await expect(
    service.checkout("order", { userId: "other" }),
  ).rejects.toMatchObject({ status: 404 });
});
it("缺少配置或回调地址不是 HTTPS 时不启用支付宝，不回退到正式网关", () => {
  vi.stubEnv(
    "ALIPAY_NOTIFY_URL",
    "http://localhost:4000/api/payments/alipay/notify",
  );
  const gateway = new AlipayGateway();
  expect(gateway.ready()).toBe(false);
  expect(() => gateway.sdk()).toThrow();
  expect(new PaymentGateway(gateway).mode()).toBe("disabled");
});

it("取消与绑定支付并发时，旧快照不能取消新绑定的订单或释放库存", async () => {
  const before = {
    id: "order",
    paymentSessionId: null,
    status: "PENDING_PAYMENT",
  };
  const current = {
    ...before,
    paymentSessionId: "alipay:LM_TEST",
    items: [{ skuId: "sku", quantity: 1 }],
  };
  const stock = vi.fn();
  const tx = {
    order: {
      findFirst: vi.fn(() => current),
      updateMany: vi.fn(
        ({ where }: { where: { paymentSessionId: string | null } }) => ({
          count: where.paymentSessionId === current.paymentSessionId ? 1 : 0,
        }),
      ),
    },
    sku: { update: stock },
  };
  const db = {
    order: { findFirst: vi.fn(() => before) },
    $transaction: vi.fn((run: (value: typeof tx) => unknown) => run(tx)),
  } as unknown as PrismaService;
  const service = new OrdersService(db, new PaymentGateway());
  await expect(
    service.cancelOrder("order", { userId: "user" }),
  ).rejects.toMatchObject({ status: 409 });
  expect(stock).not.toHaveBeenCalled();
});
