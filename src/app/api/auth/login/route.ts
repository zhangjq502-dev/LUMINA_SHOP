import { db } from "@/lib/db";
import { loginSchema } from "@/lib/auth-input";
import { verifyPassword, dummyPasswordHash } from "@/lib/password";
import { consumeAuthAttempt, startSession } from "@/lib/auth";
import { sameOrigin } from "@/lib/guest";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "请求来源无效" }, { status: 403 });
  let input;
  try {
    input = loginSchema.safeParse(await request.json());
  } catch {
    return Response.json({ error: "无效请求" }, { status: 400 });
  }
  if (!input.success)
    return Response.json({ error: "邮箱或密码格式不正确" }, { status: 400 });
  try {
    if (!(await consumeAuthAttempt(input.data.email)))
      return Response.json(
        { error: "尝试过于频繁，请 15 分钟后重试" },
        { status: 429 },
      );
    const user = await db.user.findUnique({
      where: { email: input.data.email },
    });
    const valid = await verifyPassword(
      input.data.password,
      user?.passwordHash ?? dummyPasswordHash,
    );
    if (!user || !valid)
      return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
    return await startSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch {
    return Response.json({ error: "登录失败，请稍后重试" }, { status: 503 });
  }
}
