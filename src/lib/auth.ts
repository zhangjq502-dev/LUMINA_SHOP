import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "./db";
import { guestCookie, getGuestHash, newGuestToken } from "./guest";
import { cache } from "react";
export const sessionCookie = "lumina_session";
export const sessionSeconds = 60 * 60 * 24 * 7;
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const getAuthSession = cache(async () => {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  return session && session.expiresAt > new Date() ? session : null;
});
export async function getCurrentUser() {
  return (await getAuthSession())?.user ?? null;
}
export type OrderOwner = { userId: string } | { guestHash: string };
export async function getOrderOwner(): Promise<OrderOwner | null> {
  const user = await getCurrentUser();
  if (user) return { userId: user.id };
  const guestHash = await getGuestHash();
  return guestHash ? { guestHash } : null;
}
export function ownerWhere(owner: OrderOwner) {
  return "userId" in owner
    ? { userId: owner.userId }
    : { guestHash: owner.guestHash, userId: null };
}
export async function startSession(user: {
  id: string;
  name: string;
  email: string;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const guestHash = await getGuestHash();
  const old = (await cookies()).get(sessionCookie)?.value;
  await db.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + sessionSeconds * 1000),
      },
    });
    if (old && /^[a-f0-9]{64}$/.test(old))
      await tx.session.deleteMany({ where: { tokenHash: hashToken(old) } });
    if (guestHash)
      await tx.order.updateMany({
        where: { guestHash, userId: null },
        data: { userId: user.id },
      });
  });
  const response = NextResponse.json(
    { user },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  response.cookies.set(sessionCookie, token, {
    ...cookieOptions,
    maxAge: sessionSeconds,
  });
  response.cookies.set(guestCookie, newGuestToken(), {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
export async function endSession() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token))
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  response.cookies.set(sessionCookie, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(guestCookie, newGuestToken(), {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
export async function consumeAuthAttempt(email: string) {
  const key = hashToken(email);
  const rows = await db.$queryRaw<{ attempts: number }[]>`
  INSERT INTO "AuthThrottle" (key, attempts, "resetAt") VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
  ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN "AuthThrottle"."resetAt" < NOW() THEN 1 ELSE "AuthThrottle".attempts + 1 END,
  "resetAt" = CASE WHEN "AuthThrottle"."resetAt" < NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "AuthThrottle"."resetAt" END
  RETURNING attempts`;
  return rows[0].attempts <= 20;
}
