import {
  Injectable,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { ownerWhere, type OrderOwner } from "../auth/auth.service";
import { AlipayGateway, ALIPAY_PREFIX } from "./alipay.gateway";
@Injectable()
export class AlipayService {
  constructor(
    private readonly db: PrismaService,
    private readonly gateway: AlipayGateway,
    private readonly orders: OrdersService,
  ) {}
  async checkout(id: string, owner: OrderOwner) {
    if (process.env.PAYMENT_MODE !== "alipay" || !this.gateway.ready())
      throw new ServiceUnavailableException("支付宝沙箱未开启");
    const order = await this.db.order.findFirst({
      where: { id, ...ownerWhere(owner) },
    });
    if (!order) throw new NotFoundException("订单不存在");
    if (
      order.status !== "PENDING_PAYMENT" ||
      order.expiresAt.getTime() <= Date.now() + 70000
    )
      throw new ConflictException("订单已过期、即将过期或不支持付款");
    const marker = ALIPAY_PREFIX + order.number;
    if (order.paymentSessionId && order.paymentSessionId !== marker)
      throw new ConflictException("订单已绑定其他支付方式");
    // 先生成签名链接；绑定成功且订单仍待付款才会把链接交给浏览器。
    const url = this.gateway.page(
      order.number,
      order.totalCents,
      order.expiresAt,
      id,
    );
    const linked = await this.db.order.updateMany({
      where: {
        id,
        ...ownerWhere(owner),
        status: "PENDING_PAYMENT",
        expiresAt: { gt: new Date(Date.now() + 70000) },
        OR: [{ paymentSessionId: null }, { paymentSessionId: marker }],
      },
      data: { paymentSessionId: marker },
    });
    if (!linked.count)
      throw new ConflictException("订单状态已变化，请刷新后重试");
    return { url };
  }
  async sync(id: string, owner: OrderOwner) {
    const order = await this.db.order.findFirst({
      where: { id, ...ownerWhere(owner) },
    });
    if (!order) throw new NotFoundException("订单不存在");
    if (order.paymentSessionId === ALIPAY_PREFIX + order.number) {
      const trade = await this.gateway.query(order.number);
      if (["TRADE_SUCCESS", "TRADE_FINISHED"].includes(trade.status))
        await this.orders.recordPayment(
          id,
          order.paymentSessionId,
          trade.amount,
          "cny",
        );
    }
    return { order: await this.orders.findOrder(id, owner) };
  }
  async notify(body: unknown) {
    const trade = this.gateway.verify(body);
    if (["TRADE_SUCCESS", "TRADE_FINISHED"].includes(String(trade.status))) {
      const order = await this.db.order.findUnique({
        where: { number: trade.number },
      });
      if (!order) throw new NotFoundException("通知订单不存在");
      await this.orders.recordPayment(
        order.id,
        ALIPAY_PREFIX + trade.number,
        trade.amount,
        "cny",
      );
    }
    return "success";
  }
}
