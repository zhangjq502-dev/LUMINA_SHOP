import { describe, it, expect, vi, afterEach } from "vitest";
import Stripe from "stripe";
import { PaymentGateway } from "../../backend/src/payments/payment.gateway";
import { PaymentsService } from "../../backend/src/payments/payments.service";
import { OrdersService } from "../../backend/src/orders/orders.service";
import type { PrismaService } from "../../backend/src/database/prisma.service";
afterEach(() => vi.unstubAllEnvs());
describe("Stripe 回调验签与幂等", () => {
  it("有效测试签名可以处理，重复事件只处理一次，无效签名被拒绝", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    const seen = new Set<string>();
    const record = vi.fn();
    const db = {
      paymentEvent: {
        findUnique: vi.fn(({ where }: { where: { id: string } }) =>
          seen.has(where.id) ? { id: where.id } : null,
        ),
        upsert: vi.fn(({ where }: { where: { id: string } }) => {
          seen.add(where.id);
          return { id: where.id };
        }),
      },
    } as unknown as PrismaService;
    const orders = { recordPayment: record } as unknown as OrdersService;
    const service = new PaymentsService(db, new PaymentGateway(), orders);
    const stripe = new Stripe("sk_test_fixture");
    const payload = JSON.stringify({
      id: "evt_fixture",
      livemode: false,
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_fixture",
          metadata: { orderId: "order-fixture" },
          amount_total: 100,
          currency: "cny",
          payment_status: "paid",
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_fixture",
    });
    await expect(
      service.webhook(Buffer.from(payload), "invalid"),
    ).rejects.toMatchObject({ status: 400 });
    expect(record).not.toHaveBeenCalled();
    await service.webhook(Buffer.from(payload), signature);
    await service.webhook(Buffer.from(payload), signature);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      "order-fixture",
      "cs_fixture",
      100,
      "cny",
    );
  });
  it("不会把未支付或真实环境事件标记为支付成功", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    const record = vi.fn();
    const db = {
      paymentEvent: { findUnique: vi.fn(() => null), upsert: vi.fn() },
    } as unknown as PrismaService;
    const service = new PaymentsService(db, new PaymentGateway(), {
      recordPayment: record,
    } as unknown as OrdersService);
    const stripe = new Stripe("sk_test_fixture");
    for (const live of [false, true]) {
      const payload = JSON.stringify({
        id: "evt_fixture",
        livemode: live,
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_fixture",
            metadata: { orderId: "order" },
            payment_status: "unpaid",
          },
        },
      });
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: "whsec_fixture",
      });
      if (live)
        await expect(
          service.webhook(Buffer.from(payload), signature),
        ).rejects.toMatchObject({ status: 400 });
      else await service.webhook(Buffer.from(payload), signature);
    }
    expect(record).not.toHaveBeenCalled();
  });
  it("会话编号、金额或币种不匹配时禁止改变订单状态", async () => {
    const order = {
      id: "order",
      paymentSessionId: "cs_fixture",
      totalCents: 100,
      status: "PENDING_PAYMENT",
    };
    const update = vi.fn(() => {
      order.status = "PAID";
      return { count: 1 };
    });
    const db = {
      order: { findUnique: vi.fn(() => order), updateMany: update },
    } as unknown as PrismaService;
    const service = new OrdersService(db, new PaymentGateway());
    await expect(
      service.recordPayment("order", "cs_wrong", 100, "cny"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.recordPayment("order", "cs_fixture", 1, "cny"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.recordPayment("order", "cs_fixture", 100, "usd"),
    ).rejects.toMatchObject({ status: 400 });
    expect(update).not.toHaveBeenCalled();
    await service.recordPayment("order", "cs_fixture", 100, "cny");
    await service.recordPayment("order", "cs_fixture", 100, "cny");
    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe("Stripe Checkout 请求", () => {
  it("使用数据库金额、商品数量和运费创建会话，并使用订单幂等键", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    const gateway = new PaymentGateway();
    const stripe = gateway.stripe();
    const create = vi
      .spyOn(stripe.checkout.sessions, "create")
      .mockResolvedValue({
        id: "cs_order",
        url: "https://checkout.stripe.com/test",
        expires_at: Math.floor(Date.now() / 1000) + 1860,
        payment_status: "unpaid",
      } as Stripe.Response<Stripe.Checkout.Session>);
    const order = {
      id: "order",
      status: "PENDING_PAYMENT",
      expiresAt: new Date(Date.now() + 60000),
      paymentSessionId: null,
      shippingCents: 500,
      items: [{ name: "Tee", quantity: 2, unitPriceCents: 1000 }],
    };
    const link = vi.fn(() => ({ count: 1 }));
    const db = {
      order: { findFirst: vi.fn(() => order), updateMany: link },
    } as unknown as PrismaService;
    const service = new PaymentsService(db, gateway, {} as OrdersService);
    expect(await service.checkout("order", { userId: "user" })).toEqual({
      url: "https://checkout.stripe.com/test",
    });
    const [input, options] = create.mock.calls[0];
    expect(options).toEqual({ idempotencyKey: "checkout-order" });
    expect(input?.line_items).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: "cny",
          unit_amount: 1000,
          product_data: { name: "Tee" },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "cny",
          unit_amount: 500,
          product_data: { name: "配送费用" },
        },
      },
    ]);
    expect(link).toHaveBeenCalledOnce();
  });
  it("已有支付会话会复用；Stripe 已确认付款时同步订单，不再重复创建", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    const gateway = new PaymentGateway();
    const stripe = gateway.stripe();
    vi.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue({
      id: "cs_order",
      payment_status: "paid",
      amount_total: 1000,
      currency: "cny",
    } as Stripe.Response<Stripe.Checkout.Session>);
    const create = vi.spyOn(stripe.checkout.sessions, "create");
    const db = {
      order: {
        findFirst: vi.fn(() => ({
          status: "PENDING_PAYMENT",
          expiresAt: new Date(Date.now() + 60000),
          paymentSessionId: "cs_order",
        })),
      },
    } as unknown as PrismaService;
    const record = vi.fn();
    const service = new PaymentsService(db, gateway, {
      recordPayment: record,
    } as unknown as OrdersService);
    expect(await service.checkout("order", { userId: "user" })).toEqual({
      paid: true,
    });
    expect(create).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith("order", "cs_order", 1000, "cny");
  });
  it("生产模式不会启用模拟支付，缺少回调密钥时不会启用 Stripe", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_MODE", "demo");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(new PaymentGateway().mode()).toBe("disabled");
  });
});
