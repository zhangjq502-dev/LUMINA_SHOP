import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PaymentGateway } from "./payment.gateway";
import { OrdersService } from "../orders/orders.service";
import { type OrderOwner, ownerWhere } from "../auth/auth.service";
import { frontendOrigin } from "../config";
@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: PrismaService,
    private readonly gateway: PaymentGateway,
    private readonly orders: OrdersService,
  ) {}
  config() {
    return { mode: this.gateway.mode() };
  }
  async owned(id: string, owner: OrderOwner) {
    const order = await this.db.order.findFirst({
      where: { id, ...ownerWhere(owner) },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("订单不存在");
    return order;
  }
  async checkout(id: string, owner: OrderOwner) {
    const order = await this.owned(id, owner);
    if (order.status !== "PENDING_PAYMENT" || order.expiresAt < new Date())
      throw new ConflictException("订单已过期或不支持付款");
    if (this.gateway.mode() !== "stripe")
      throw new ServiceUnavailableException(
        "请配置 Stripe 测试密钥和回调签名密钥",
      );
    const stripe = this.gateway.stripe();
    let session;
    if (order.paymentSessionId)
      session = await stripe.checkout.sessions.retrieve(order.paymentSessionId);
    else {
      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          client_reference_id: id,
          metadata: { orderId: id },
          line_items: [
            ...order.items.map((i) => ({
              quantity: i.quantity,
              price_data: {
                currency: "cny",
                unit_amount: i.unitPriceCents,
                product_data: { name: i.name },
              },
            })),
            ...(order.shippingCents > 0
              ? [
                  {
                    quantity: 1,
                    price_data: {
                      currency: "cny",
                      unit_amount: order.shippingCents,
                      product_data: { name: "配送费用" },
                    },
                  },
                ]
              : []),
          ],
          success_url: `${frontendOrigin}/orders/${id}?payment=success`,
          cancel_url: `${frontendOrigin}/orders/${id}?payment=cancelled`,
          expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        },
        { idempotencyKey: `checkout-${id}` },
      );
      const linked = await this.db.order.updateMany({
        where: {
          id,
          status: "PENDING_PAYMENT",
          paymentSessionId: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          paymentSessionId: session.id,
          expiresAt: new Date(session.expires_at * 1000),
        },
      });
      if (!linked.count) {
        const current = await this.db.order.findUnique({ where: { id } });
        if (current?.paymentSessionId !== session.id) {
          await this.gateway.close(session.id);
          throw new ConflictException("订单状态已改变，请刷新");
        }
      }
    }
    if (session.payment_status === "paid") {
      await this.orders.recordPayment(
        id,
        session.id,
        session.amount_total ?? -1,
        session.currency ?? "",
      );
      return { paid: true };
    }
    if (!session.url)
      throw new ConflictException("支付会话已结束，请同步支付状态");
    return { url: session.url };
  }
  async demo(id: string, owner: OrderOwner) {
    if (this.gateway.mode() !== "demo")
      throw new ServiceUnavailableException("本地模拟支付未开启");
    const order = await this.owned(id, owner);
    if (order.status === "PAID") return { ok: true };
    if (order.expiresAt < new Date() || order.paymentSessionId)
      throw new ConflictException("订单已过期或使用其他支付方式");
    const updated = await this.db.order.updateMany({
      where: { id, status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (!updated.count) throw new ConflictException("当前订单不支持付款");
    return { ok: true };
  }
  async sync(id: string, owner: OrderOwner) {
    const order = await this.owned(id, owner);
    if (order.paymentSessionId) {
      const session = await this.gateway
        .stripe()
        .checkout.sessions.retrieve(order.paymentSessionId);
      if (session.payment_status === "paid")
        await this.orders.recordPayment(
          id,
          session.id,
          session.amount_total ?? -1,
          session.currency ?? "",
        );
    }
    return { order: await this.orders.findOrder(id, owner) };
  }
  async webhook(body: Buffer, signature: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException("支付回调尚未配置");
    let event;
    try {
      event = this.gateway
        .stripe()
        .webhooks.constructEvent(body, signature, secret);
    } catch {
      throw new BadRequestException("支付回调签名无效");
    }
    if (event.livemode) throw new BadRequestException("仅支持 Stripe 测试模式");
    if (await this.db.paymentEvent.findUnique({ where: { id: event.id } }))
      return { received: true };
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        const id = session.metadata?.orderId;
        if (!id) throw new BadRequestException("缺少订单信息");
        await this.orders.recordPayment(
          id,
          session.id,
          session.amount_total ?? -1,
          session.currency ?? "",
        );
      }
    }
    await this.db.paymentEvent.upsert({
      where: { id: event.id },
      create: { id: event.id },
      update: {},
    });
    return { received: true };
  }
}
