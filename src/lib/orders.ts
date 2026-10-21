import "server-only";
import { ownerWhere, type OrderOwner } from "./auth";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import type { Order } from "@/types/shop";
import { Prisma } from "@/generated/prisma/client";
export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1).max(80),
            size: z.string().min(1).max(20),
            quantity: z.number().int().min(1).max(10),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    shipping: z
      .object({
        recipient: z.string().trim().min(1).max(60),
        phone: z
          .string()
          .trim()
          .regex(/^[+\d ()-]{6,30}$/),
        email: z.email().max(120),
        province: z.string().trim().min(1).max(60),
        district: z.string().trim().min(1).max(60),
        address: z.string().trim().min(5).max(200),
      })
      .strict(),
  })
  .strict();
export class OrderError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
type Row = Prisma.OrderGetPayload<{ include: { items: true } }>;
export function serializeOrder(o: Row): Order {
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
export async function listOrders(owner: OrderOwner) {
  return (
    await db.order.findMany({
      where: ownerWhere(owner),
      include: { items: true },
      orderBy: { createdAt: "desc" },
    })
  ).map(serializeOrder);
}
export async function findOrder(id: string, owner: OrderOwner) {
  const row = await db.order.findFirst({
    where: { id, ...ownerWhere(owner) },
    include: { items: true },
  });
  return row ? serializeOrder(row) : null;
}
export async function createOrder(
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
  const existing = await db.order.findUnique({
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
    return await db.$transaction(async (tx) => {
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
      const previous = await db.order.findUnique({
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

export async function cancelOrder(id: string, owner: OrderOwner) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, ...ownerWhere(owner) },
      include: { items: true },
    });
    if (!order) throw new OrderError("订单不存在", 404);
    if (order.status === "CANCELLED") return serializeOrder(order);
    const changed = await tx.order.updateMany({
      where: { id, ...ownerWhere(owner), status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED" },
    });
    if (changed.count !== 1) throw new OrderError("当前订单状态不支持取消");
    for (const item of order.items)
      await tx.sku.update({
        where: { id: item.skuId },
        data: { stock: { increment: item.quantity } },
      });
    return serializeOrder({ ...order, status: "CANCELLED" });
  });
}
