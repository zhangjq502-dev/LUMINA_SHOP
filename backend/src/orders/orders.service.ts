import { PaymentGateway } from "../payments/payment.gateway";
import { Injectable, HttpException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import { ownerWhere, type OrderOwner } from "../auth/auth.service";
import { checkoutSchema } from "./order.dto";
class OrderError extends HttpException {
  constructor(message: string, status = 409) {
    super(message, status);
  }
}
type Row = Prisma.OrderGetPayload<{ include: { items: true } }>;
function serializeOrder(o: Row) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    totalCents: o.totalCents,
    shippingCents: o.shippingCents,
    recipient: o.recipient,
    phone: o.phone,
    email: o.email,
    province: o.province,
    district: o.district,
    address: o.address,
    createdAt: o.createdAt.toISOString(),
    expiresAt: o.expiresAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    paymentSessionId: o.paymentSessionId,
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    items: o.items.map(
      ({
        id,
        productId,
        name,
        subtitle,
        image,
        color,
        size,
        quantity,
        unitPriceCents,
      }) => ({
        id,
        productId,
        name,
        subtitle,
        image,
        color,
        size,
        quantity,
        unitPriceCents,
      }),
    ),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: PrismaService,
    private readonly gateway: PaymentGateway,
  ) {}
  async listOrders(owner: OrderOwner) {
    return (
      await this.db.order.findMany({
        where: ownerWhere(owner),
        include: { items: true },
        orderBy: { createdAt: "desc" },
      })
    ).map(serializeOrder);
  }
  async findOrder(id: string, owner: OrderOwner) {
    const row = await this.db.order.findFirst({
      where: { id, ...ownerWhere(owner) },
      include: { items: true },
    });
    return row ? serializeOrder(row) : null;
  }
  async createOrder(
    input: z.infer<typeof checkoutSchema>,
    guestHash: string,
    userId: string | null = null,
  ) {
    const merged = new Map<
      string,
      { id: string; size: string; quantity: number }
    >();
    for (const item of input.items) {
      const key = JSON.stringify([item.id, item.size]);
      const old = merged.get(key);
      const quantity = (old?.quantity ?? 0) + item.quantity;
      if (quantity > 10) throw new OrderError("每个规格最多购买 10 件", 400);
      merged.set(key, { ...item, quantity });
    }
    const items = [...merged.values()].sort(
      (a, b) => a.id.localeCompare(b.id) || a.size.localeCompare(b.size),
    );
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ items, shipping: input.shipping }))
      .digest("hex");
    const where = {
      guestHash_idempotencyKey: {
        guestHash,
        idempotencyKey: input.idempotencyKey,
      },
    };
    const existing = await this.db.order.findUnique({
      where,
      include: { items: true },
    });
    if (existing) {
      if (existing.userId !== userId) throw new OrderError("订单不存在", 404);
      if (existing.requestHash !== requestHash)
        throw new OrderError("该提交编号已用于另一笔订单，请刷新后重试");
      return serializeOrder(existing);
    }
    try {
      return await this.db.$transaction(async (tx) => {
        const snapshots = [];
        for (const item of items) {
          const sku = await tx.sku.findUnique({
            where: { productId_size: { productId: item.id, size: item.size } },
            include: { product: true },
          });
          if (!sku || !sku.product.active)
            throw new OrderError("商品或规格已不可用，请重新选择", 400);
          const changed = await tx.sku.updateMany({
            where: { id: sku.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (changed.count !== 1)
            throw new OrderError(
              `${sku.product.subtitle}（${item.size}）库存不足`,
            );
          snapshots.push({
            productId: item.id,
            skuId: sku.id,
            name: sku.product.name,
            subtitle: sku.product.subtitle,
            image: sku.product.image,
            color: sku.product.color,
            size: item.size,
            quantity: item.quantity,
            unitPriceCents: sku.priceCents,
          });
        }
        const totalCents = snapshots.reduce(
          (sum, i) => sum + i.unitPriceCents * i.quantity,
          0,
        );
        if (!Number.isSafeInteger(totalCents) || totalCents > 2147483647)
          throw new OrderError("订单金额超过支持范围，请分开下单", 400);
        const order = await tx.order.create({
          data: {
            number: `LM${Date.now()}${randomBytes(3).toString("hex").toUpperCase()}`,
            guestHash,
            userId,
            idempotencyKey: input.idempotencyKey,
            requestHash,
            ...input.shipping,
            totalCents,
            items: { create: snapshots },
          },
          include: { items: true },
        });
        return serializeOrder(order);
      });
    } catch (error) {
      {
        const previous = await this.db.order.findUnique({
          where,
          include: { items: true },
        });
        if (
          previous &&
          previous.userId === userId &&
          previous.requestHash === requestHash
        )
          return serializeOrder(previous);
      }
      throw error;
    }
  }

  async cancelOrder(id: string, owner: OrderOwner, expired = false) {
    const pending = await this.db.order.findFirst({
      where: { id, ...ownerWhere(owner) },
    });
    if (!pending) throw new OrderError("订单不存在", 404);
    if (pending.status === "PENDING_PAYMENT" && pending.paymentSessionId) {
      const session = await this.gateway.close(pending.paymentSessionId);
      if (session.payment_status === "paid") {
        await this.recordPayment(
          id,
          session.id,
          session.amount_total ?? -1,
          session.currency ?? "",
        );
        throw new OrderError("订单已付款，无法取消");
      }
    }

    return this.db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, ...ownerWhere(owner) },
        include: { items: true },
      });
      if (!order) throw new OrderError("订单不存在", 404);
      if (order.status === "CANCELLED" || order.status === "EXPIRED")
        return serializeOrder(order);
      const changed = await tx.order.updateMany({
        where: { id, ...ownerWhere(owner), status: "PENDING_PAYMENT" },
        data: { status: expired ? "EXPIRED" : "CANCELLED" },
      });
      if (changed.count !== 1) throw new OrderError("当前订单状态不支持取消");
      for (const item of order.items)
        await tx.sku.update({
          where: { id: item.skuId },
          data: { stock: { increment: item.quantity } },
        });
      return serializeOrder({
        ...order,
        status: expired ? "EXPIRED" : "CANCELLED",
      });
    });
  }

  async expireOverdue() {
    const orders = await this.db.order.findMany({
      where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } },
      take: 100,
      orderBy: { expiresAt: "asc" },
    });
    for (const order of orders) {
      try {
        await this.cancelOrder(
          order.id,
          order.userId
            ? { userId: order.userId }
            : { guestHash: order.guestHash },
          true,
        );
      } catch {
        /* 下一轮重试，支付服务不可用时不提前释放库存。 */
      }
    }
  }
  async recordPayment(
    id: string,
    sessionId: string,
    amount: number,
    currency: string,
  ) {
    const order = await this.db.order.findUnique({ where: { id } });
    if (
      !order ||
      order.paymentSessionId !== sessionId ||
      order.totalCents !== amount ||
      currency !== "cny"
    )
      throw new OrderError("支付金额或订单信息不匹配", 400);
    if (
      order.status === "PAID" ||
      order.status === "SHIPPED" ||
      order.status === "COMPLETED"
    )
      return;
    const updated = await this.db.order.updateMany({
      where: { id, status: "PENDING_PAYMENT" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (updated.count !== 1) throw new OrderError("订单状态不允许付款");
  }
  async confirmReceipt(id: string, owner: OrderOwner) {
    const updated = await this.db.order.updateMany({
      where: { id, ...ownerWhere(owner), status: "SHIPPED" },
      data: { status: "COMPLETED" },
    });
    if (updated.count !== 1) throw new OrderError("订单不存在或尚未发货");
    return this.findOrder(id, owner);
  }
}
