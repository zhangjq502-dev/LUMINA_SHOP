import type { Request } from "express";
import { createHash, randomBytes } from "node:crypto";
export const guestCookie = "lumina_guest";
export const sessionCookie = "lumina_session";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export function readToken(request: Request, name: string): string | null {
  const value: unknown = request.cookies?.[name];
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
    ? value
    : null;
}
export function guestHash(request: Request) {
  const token = readToken(request, guestCookie);
  return token ? hashToken(token) : null;
}
