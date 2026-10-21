import { Injectable, BadRequestException, HttpException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { MailService } from "../mail/mail.service";
import { AuthService } from "./auth.service";
import { newToken, hashToken } from "../common/cookies";
import { hashPassword } from "./password";
import { frontendOrigin } from "../config";
@Injectable()
export class RecoveryService {
  constructor(
    private readonly db: PrismaService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
  ) {}
  async issue(email: string, purpose: "RESET" | "VERIFY") {
    if (!(await this.auth.consumeAttempt(`${purpose}:${email}`)))
      throw new HttpException("请求过于频繁，请稍后重试", 429);
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || (purpose === "VERIFY" && user.emailVerifiedAt))
      return { ok: true };
    const raw = newToken();
    const tokenHash = hashToken(raw);
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
      await tx.emailToken.deleteMany({ where: { userId: user.id, purpose } });
      await tx.emailToken.create({
        data: {
          tokenHash,
          userId: user.id,
          purpose,
          expiresAt: new Date(
            Date.now() + (purpose === "RESET" ? 15 * 60 : 24 * 60 * 60) * 1000,
          ),
        },
      });
    });
    const url = `${frontendOrigin}/${purpose === "RESET" ? "reset-password" : "verify-email"}?token=${raw}`;
    try {
      await this.mail.send(
        email,
        purpose === "RESET" ? "LUMINA 重置密码" : "LUMINA 验证邮箱",
        `请打开以下链接${purpose === "RESET" ? "重置密码（15 分钟有效）" : "验证邮箱（24 小时有效）"}：\n${url}\n如非本人操作，请忽略此邮件。`,
      );
    } catch (error) {
      await this.db.emailToken.deleteMany({ where: { tokenHash } });
      throw error;
    }
    return { ok: true };
  }
  async consume(raw: string, purpose: "RESET" | "VERIFY", password?: string) {
    const tokenHash = hashToken(raw);
    const existing = await this.db.emailToken.findUnique({
      where: { tokenHash },
    });
    if (
      !existing ||
      existing.purpose !== purpose ||
      existing.expiresAt < new Date()
    )
      throw new BadRequestException("链接已失效，请重新申请");
    if (purpose === "RESET" && !password)
      throw new BadRequestException("请输入新密码");
    const passwordHash = password ? await hashPassword(password) : undefined;
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${existing.userId} FOR UPDATE`;
      const token = await tx.emailToken.findUnique({ where: { tokenHash } });
      if (!token || token.purpose !== purpose || token.expiresAt < new Date())
        throw new BadRequestException("链接已失效，请重新申请");
      const used = await tx.emailToken.deleteMany({
        where: { tokenHash, purpose, expiresAt: { gt: new Date() } },
      });
      if (!used.count) throw new BadRequestException("链接已使用");
      await tx.user.update({
        where: { id: token.userId },
        data:
          purpose === "RESET"
            ? { passwordHash }
            : { emailVerifiedAt: new Date() },
      });
      if (purpose === "RESET")
        await tx.session.deleteMany({ where: { userId: token.userId } });
      await tx.emailToken.deleteMany({
        where: { userId: token.userId, purpose },
      });
    });
    return { ok: true };
  }
}
