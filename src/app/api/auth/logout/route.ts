import { endSession } from "@/lib/auth";
import { sameOrigin } from "@/lib/guest";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "请求来源无效" }, { status: 403 });
  try {
    return await endSession();
  } catch {
    return Response.json({ error: "退出失败，请重试" }, { status: 503 });
  }
}
