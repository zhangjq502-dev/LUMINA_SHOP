import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../database/prisma.service";
import { shippingSchema } from "../orders/order.dto";
import { hashPassword, verifyPassword } from "../auth/password";
export const addressSchema = shippingSchema
  .omit({ email: true })
  .extend({ isDefault: z.boolean().default(false) })
  .strict();
@Injectable()
export class AccountService {
  constructor(private readonly db: PrismaService) {}
  list(userId: string) {
    return this.db.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }
  async save(userId: string, body: unknown, id?: string) {
    const input = addressSchema.safeParse(body);
    if (!input.success)
      throw new BadRequestException("请填写完整有效的收货信息");
    return this.db.$transaction(async (tx) => {
      // 同一用户的地址写入串行化，确保始终只有一个默认地址。
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
      const existing = id
        ? await tx.address.findFirst({ where: { id, userId } })
        : null;
      if (id && !existing) throw new NotFoundException("地址不存在");
      const count = await tx.address.count({ where: { userId } });
      if (!id && count >= 10)
        throw new BadRequestException("最多保存 10 个地址");
      const isDefault =
        input.data.isDefault || count === 0 || existing?.isDefault === true;
      if (isDefault)
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      return id
        ? tx.address.update({
            where: { id },
            data: { ...input.data, isDefault },
          })
        : tx.address.create({ data: { ...input.data, userId, isDefault } });
    });
  }
  async remove(userId: string, id: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
      const item = await tx.address.findFirst({ where: { id, userId } });
      if (!item) throw new NotFoundException("地址不存在");
      await tx.address.delete({ where: { id } });
      if (item.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
        });
        if (next)
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
      }
      return { ok: true };
    });
  }
  async profile(userId: string, body: unknown) {
    const input = z
      .object({ name: z.string().trim().min(1).max(40) })
      .strict()
      .safeParse(body);
    if (!input.success) throw new BadRequestException("昵称须为 1–40 个字符");
    return this.db.user.update({
      where: { id: userId },
      data: input.data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerifiedAt: true,
      },
    });
  }
  async password(userId: string, body: unknown) {
    const input = z
      .object({
        currentPassword: z.string().min(8).max(128),
        newPassword: z.string().min(8).max(128),
      })
      .strict()
      .safeParse(body);
    if (!input.success) throw new BadRequestException("密码须为 8–128 个字符");
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!(await verifyPassword(input.data.currentPassword, user.passwordHash)))
      throw new UnauthorizedException("当前密码不正确");
    const passwordHash = await hashPassword(input.data.newPassword);
    await this.db.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: userId, passwordHash: user.passwordHash },
        data: { passwordHash },
      });
      if (!changed.count)
        throw new UnauthorizedException("密码已改变，请重新登录");
      await tx.session.deleteMany({ where: { userId } });
      await tx.emailToken.deleteMany({ where: { userId, purpose: "RESET" } });
    });
    return { ok: true };
  }
}
