import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service";
import { guestHash } from "../common/cookies";
import { OrdersService } from "./orders.service";
import { checkoutSchema } from "./order.dto";
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly auth: AuthService,
  ) {}
  @Get() async list(@Req() req: Request) {
    const owner = await this.auth.getOwner(req);
    return { orders: owner ? await this.orders.listOrders(owner) : [] };
  }
  @Get(":id") async detail(@Param("id") id: string, @Req() req: Request) {
    const owner = await this.auth.getOwner(req);
    if (!owner) throw new NotFoundException("订单不存在");
    const order = await this.orders.findOrder(id, owner);
    if (!order) throw new NotFoundException("订单不存在");
    return { order };
  }
  @Post() async create(@Body() body: unknown, @Req() req: Request) {
    const hash = guestHash(req);
    if (!hash) throw new UnauthorizedException("请先建立访客会话");
    const input = checkoutSchema.safeParse(body);
    if (!input.success)
      throw new BadRequestException("请检查商品数量与收货信息");
    const user = await this.auth.getUser(req);
    return {
      order: await this.orders.createOrder(input.data, hash, user?.id ?? null),
    };
  }
  @Patch(":id") async cancel(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    if (
      !body ||
      typeof body !== "object" ||
      !("action" in body) ||
      body.action !== "cancel"
    )
      throw new BadRequestException("不支持的操作");
    const owner = await this.auth.getOwner(req);
    if (!owner) throw new NotFoundException("订单不存在");
    return { order: await this.orders.cancelOrder(id, owner) };
  }
  @Post(":id/confirm") async confirm(
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    const owner = await this.auth.getOwner(req);
    if (!owner) throw new NotFoundException("订单不存在");
    return { order: await this.orders.confirmReceipt(id, owner) };
  }
}
