import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
export const guestCookie = "lumina_guest";
export function newGuestToken() {
  return randomBytes(32).toString("hex");
}
export async function getGuestHash() {
  const token = (await cookies()).get(guestCookie)?.value;
  return token && /^[a-f0-9]{64}$/.test(token)
    ? createHash("sha256").update(token).digest("hex")
    : null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
