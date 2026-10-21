import { config } from "dotenv";
config({ quiet: true });
const development = process.env.DATABASE_URL;
if (!development) throw new Error("请先配置 .env 中的 DATABASE_URL");
const test = new URL(process.env.TEST_DATABASE_URL ?? development);
if (!process.env.TEST_DATABASE_URL) test.pathname = "/lumina_shop_test";
// 防止测试脚本误连开发库或生产库；只允许独立的 *_test 数据库。
if (
  !/^\/[a-zA-Z0-9_]+_test$/.test(test.pathname) ||
  test.pathname === new URL(development).pathname
)
  throw new Error("测试必须使用独立的 *_test 数据库");
export const testDatabaseUrl = test.toString();
export const testOrigin = "http://localhost:5173";
