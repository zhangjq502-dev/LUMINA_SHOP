import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { SessionGuard, type AuthenticatedRequest } from "../auth/session.guard";
import { AuthService } from "../auth/auth.service";
import { AccountService } from "./account.service";
@Controller("account")
@UseGuards(SessionGuard)
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly auth: AuthService,
  ) {}
  @Get("addresses") async list(@Req() req: AuthenticatedRequest) {
    return { addresses: await this.account.list(req.user.id) };
  }
  @Post("addresses") async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return { address: await this.account.save(req.user.id, body) };
  }
  @Patch("addresses/:id") async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return { address: await this.account.save(req.user.id, body, id) };
  }
  @Delete("addresses/:id") remove(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.account.remove(req.user.id, id);
  }
  @Patch("profile") async profile(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return { user: await this.account.profile(req.user.id, body) };
  }
  @Post("password") async password(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.account.password(req.user.id, body);
    return this.auth.logout(req, res);
  }
}
