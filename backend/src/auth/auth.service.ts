import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { PrismaService } from "../database/prisma.service";
import { cookieOptions } from "../config";
import {
  guestCookie,
  sessionCookie,
  readToken,
  hashToken,
  newToken,
  guestHash,
} from "../common/cookies";
export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerifiedAt: Date | null;
};
export type OrderOwner = { userId: string } | { guestHash: string };
export function ownerWhere(owner: OrderOwner) {
  return "userId" in owner
    ? { userId: owner.userId }
    : { guestHash: owner.guestHash, userId: null };
}
@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService) {}
  async getUser(request: Request): Promise<SafeUser | null> {
    const token = readToken(request, sessionCookie);
    if (!token) return null;
    const session = await this.db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            emailVerifiedAt: true,
          },
        },
      },
    });
    return session && session.expiresAt > new Date() ? session.user : null;
  }
  async getOwner(request: Request): Promise<OrderOwner | null> {
    const user = await this.getUser(request);
    if (user) return { userId: user.id };
    const hash = guestHash(request);
    return hash ? { guestHash: hash } : null;
  }
  async startSession(user: SafeUser, request: Request, response: Response) {
    const token = newToken();
    const old = readToken(request, sessionCookie);
    const guest = guestHash(request);
    await this.db.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      if (old)
        await tx.session.deleteMany({ where: { tokenHash: hashToken(old) } });
      if (guest)
        await tx.order.updateMany({
          where: { guestHash: guest, userId: null },
          data: { userId: user.id },
        });
    });
    response.cookie(sessionCookie, token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    response.cookie(guestCookie, newToken(), {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { user };
  }
  async logout(request: Request, response: Response) {
    const token = readToken(request, sessionCookie);
    if (token)
      await this.db.session.deleteMany({
        where: { tokenHash: hashToken(token) },
      });
    response.clearCookie(sessionCookie, cookieOptions);
    response.cookie(guestCookie, newToken(), {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { ok: true };
  }
  async consumeAttempt(email: string) {
    const key = hashToken(email);
    const rows = await this.db.$queryRaw<{ attempts: number }[]>`
 INSERT INTO "AuthThrottle" (key,attempts,"resetAt") VALUES (${key},1,NOW()+INTERVAL '15 minutes')
 ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN "AuthThrottle"."resetAt"<NOW() THEN 1 ELSE "AuthThrottle".attempts+1 END,
 "resetAt"=CASE WHEN "AuthThrottle"."resetAt"<NOW() THEN NOW()+INTERVAL '15 minutes' ELSE "AuthThrottle"."resetAt" END RETURNING attempts`;
    return rows[0].attempts <= 20;
  }
}
