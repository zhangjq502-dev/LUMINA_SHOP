import { db } from "@/lib/db";
import { registerSchema } from "@/lib/auth-input";
import { hashPassword } from "@/lib/password";
import { consumeAuthAttempt, startSession } from "@/lib/auth";
import { sameOrigin } from "@/lib/guest";
import { Prisma } from "@/generated/prisma/client";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "请求来源无效" }, { status: 403 });
  let input;
  try {
    input = registerSchema.safeParse(await request.json());
  } catch {
    return Response.json({ error: "无效请求" }, { status: 400 });
  }
  if (!input.success)
    return Response.json(
      { error: "请填写昵称、有效邮箱及 8–128 位密码" },
      { status: 400 },
    );
  try {
    if (!(await consumeAuthAttempt(input.data.email)))
      return Response.json(
        { error: "尝试过于频繁，请 15 分钟后重试" },
        { status: 429 },
      );
    const passwordHash = await hashPassword(input.data.password);
    const user = await db.user.create({
      data: { email: input.data.email, name: input.data.name, passwordHash },
      select: { id: true, email: true, name: true },
    });
    return await startSession(user);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return Response.json({ error: "该邮箱已注册，请登录" }, { status: 409 });
    return Response.json({ error: "注册失败，请稍后重试" }, { status: 503 });
  }
}
