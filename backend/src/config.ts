import { config } from "dotenv";
import { resolve } from "node:path";
// 从独立后端目录启动或从仓库根目录启动，都能找到本地配置。
config({ path: resolve(__dirname, "../.env"), quiet: true });
config({ path: resolve(__dirname, "../../.env"), quiet: true });
export const port = Number(process.env.PORT ?? 4000);
export const frontendOrigin =
  process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};
