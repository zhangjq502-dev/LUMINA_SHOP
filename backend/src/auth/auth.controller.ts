import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  HttpCode,
  HttpException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { PrismaService } from "../database/prisma.service";
import { loginSchema, registerSchema } from "./auth.dto";
import { hashPassword, verifyPassword, dummyPasswordHash } from "./password";
import { Prisma } from "../generated/prisma/client";
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly db: PrismaService,
  ) {}
  @Get("me") async me(@Req() req: Request) {
    return { user: await this.auth.getUser(req) };
  }
  @Post("register")
  @HttpCode(200)
  async register(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = registerSchema.safeParse(body);
    if (!input.success)
      throw new BadRequestException("请填写昵称、有效邮箱及 8–128 位密码");
    if (!(await this.auth.consumeAttempt(input.data.email)))
      throw new HttpException("尝试过于频繁，请 15 分钟后重试", 429);
    try {
      const passwordHash = await hashPassword(input.data.password);
      const user = await this.db.user.create({
        data: { email: input.data.email, name: input.data.name, passwordHash },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerifiedAt: true,
        },
      });
      return await this.auth.startSession(user, req, res);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("该邮箱已注册，请登录");
      throw error;
    }
  }
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = loginSchema.safeParse(body);
    if (!input.success) throw new BadRequestException("邮箱或密码格式不正确");
    if (!(await this.auth.consumeAttempt(input.data.email)))
      throw new HttpException("尝试过于频繁，请 15 分钟后重试", 429);
    const user = await this.db.user.findUnique({
      where: { email: input.data.email },
    });
    const valid = await verifyPassword(
      input.data.password,
      user?.passwordHash ?? dummyPasswordHash,
    );
    if (!user || !valid) throw new UnauthorizedException("邮箱或密码不正确");
    return this.auth.startSession(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
        email: user.email,
      },
      req,
      res,
    );
  }
  @Post("logout") @HttpCode(200) logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(req, res);
  }
}
