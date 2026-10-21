import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { RecoveryService } from "./recovery.service";
import { SessionGuard, type AuthenticatedRequest } from "./session.guard";
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
@Controller("auth")
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}
  @Post("forgot-password") forgot(@Body() body: unknown) {
    const input = z
      .object({
        email: z
          .string()
          .trim()
          .email()
          .max(120)
          .transform((v) => v.toLowerCase()),
      })
      .strict()
      .safeParse(body);
    if (!input.success) throw new BadRequestException("请输入有效邮箱");
    return this.recovery.issue(input.data.email, "RESET");
  }
  @Post("reset-password") reset(@Body() body: unknown) {
    const input = z
      .object({ token: tokenSchema, password: z.string().min(8).max(128) })
      .strict()
      .safeParse(body);
    if (!input.success) throw new BadRequestException("链接或密码格式无效");
    return this.recovery.consume(
      input.data.token,
      "RESET",
      input.data.password,
    );
  }
  @Post("verification-email") @UseGuards(SessionGuard) verifyMail(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.recovery.issue(req.user.email, "VERIFY");
  }
  @Post("verify-email") verify(@Body() body: unknown) {
    const input = z.object({ token: tokenSchema }).strict().safeParse(body);
    if (!input.success) throw new BadRequestException("链接无效");
    return this.recovery.consume(input.data.token, "VERIFY");
  }
}
