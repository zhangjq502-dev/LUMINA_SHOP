import { OrdersService } from "../orders/orders.service";
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import { SessionGuard } from "../auth/session.guard";
import { AdminGuard } from "./admin.guard";
import { PrismaService } from "../database/prisma.service";
@Controller("admin")
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly db: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}
  @Get("orders") async orders() {
    return {
      orders: await this.db.order.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    };
  }
  @Get("products") async products() {
    return {
      products: await this.db.product.findMany({
        include: { skus: true },
        orderBy: { sortOrder: "asc" },
      }),
    };
  }
  @Patch("products/:id") async product(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = z
      .object({
        name: z.string().trim().min(1).max(100),
        priceCents: z.number().int().min(1).max(100000000),
        active: z.boolean(),
      })
      .strict()
      .safeParse(body);
    if (!input.success) throw new BadRequestException("商品资料无效");
    if (!(await this.db.product.findUnique({ where: { id } })))
      throw new NotFoundException("商品不存在");
    const product = await this.db.$transaction(async (tx) => {
      await tx.sku.updateMany({
        where: { productId: id },
        data: { priceCents: input.data.priceCents },
      });
      return tx.product.update({ where: { id }, data: input.data });
    });
    return { product };
  }
  @Patch("skus/:id") async sku(@Param("id") id: string, @Body() body: unknown) {
    const input = z
      .object({ addStock: z.number().int().min(1).max(10000) })
      .strict()
      .safeParse(body);
    if (!input.success) throw new BadRequestException("补货数量须为 1–10000");
    if (!(await this.db.sku.findUnique({ where: { id } })))
      throw new NotFoundException("规格不存在");
    return {
      sku: await this.db.sku.update({
        where: { id },
        data: { stock: { increment: input.data.addStock } },
      }),
    };
  }
  @Patch("orders/:id/ship") async ship(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = z
      .object({
        carrier: z.string().trim().min(1).max(60),
        trackingNumber: z.string().trim().min(1).max(80),
      })
      .strict()
      .safeParse(body);
    if (!input.success) throw new BadRequestException("请填写承运商和物流单号");
    const changed = await this.db.order.updateMany({
      where: { id, status: "PAID" },
      data: { ...input.data, status: "SHIPPED" },
    });
    if (!changed.count) throw new ConflictException("只有已付款订单可以发货");
    return { ok: true };
  }

  @Post("orders/expire") async expire() {
    await this.ordersService.expireOverdue();
    return { ok: true };
  }
  @Post("products") async createProduct(@Body() body: unknown) {
    const input = z
      .object({
        id: z.string().regex(/^[a-z0-9-]{2,50}$/),
        name: z.string().trim().min(1).max(100),
        subtitle: z.string().trim().min(1).max(100),
        category: z.string().trim().min(1).max(40),
        priceCents: z.number().int().min(1).max(100000000),
        image: z.string().regex(/^\/images\/[a-zA-Z0-9._-]+$/),
        color: z.string().trim().min(1).max(40),
        description: z.string().trim().min(1).max(1000),
        sizes: z.array(z.string().min(1).max(20)).min(1).max(10),
        stock: z.number().int().min(0).max(10000),
      })
      .strict()
      .safeParse(body);
    if (!input.success) throw new BadRequestException("请填写完整的商品信息");
    if (await this.db.product.findUnique({ where: { id: input.data.id } }))
      throw new ConflictException("商品编号已存在");
    const { sizes, stock, ...data } = input.data;
    const product = await this.db.product.create({
      data: {
        ...data,
        colors: ["#eeeae4"],
        sortOrder: await this.db.product.count(),
        skus: {
          create: [...new Set(sizes)].map((size) => ({
            size,
            stock,
            priceCents: data.priceCents,
          })),
        },
      },
    });
    return { product };
  }
}
