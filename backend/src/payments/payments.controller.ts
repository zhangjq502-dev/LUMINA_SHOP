import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Headers,
  NotFoundException,
  RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service";
import { PaymentsService } from "./payments.service";
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly auth: AuthService,
  ) {}
  @Get("config") config() {
    return this.payments.config();
  }
  @Post("webhook") webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    return this.payments.webhook(
      req.rawBody ?? Buffer.alloc(0),
      signature ?? "",
    );
  }
  @Post(":id/checkout") async checkout(
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    const owner = await this.auth.getOwner(req);
    if (!owner) throw new NotFoundException("订单不存在");
    return this.payments.checkout(id, owner);
  }
  @Post(":id/demo") async demo(@Param("id") id: string, @Req() req: Request) {
    const owner = await this.auth.getOwner(req);
    if (!owner) throw new NotFoundException("订单不存在");
    return this.payments.demo(id, owner);
  }
  @Post(":id/sync") async sync(@Param("id") id: string, @Req() req: Request) {
    const owner = await this.auth.getOwner(req);
    if (!owner) throw new NotFoundException("订单不存在");
    return this.payments.sync(id, owner);
  }
}
