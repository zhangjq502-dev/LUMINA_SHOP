import { getCurrentUser } from "@/lib/auth";
export async function GET() {
  try {
    return Response.json(
      { user: await getCurrentUser() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "无法读取登录状态" }, { status: 503 });
  }
}
