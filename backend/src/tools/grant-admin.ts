import "../config";
import { PrismaService } from "../database/prisma.service";
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("用法：npm run admin:grant -- 邮箱");
  process.exit(1);
}
const db = new PrismaService();
void db.user
  .update({ where: { email }, data: { role: "ADMIN" }, select: { id: true } })
  .then(() => console.log("管理员权限已授予。"))
  .catch(() => {
    console.error("操作失败，请确认该邮箱已注册。");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
