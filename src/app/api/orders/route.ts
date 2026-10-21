import { getOrderOwner, getCurrentUser } from "@/lib/auth";
import { getGuestHash, sameOrigin } from "@/lib/guest";
import {
  checkoutSchema,
  createOrder,
  listOrders,
  OrderError,
} from "@/lib/orders";
export async function GET() {
  try {
    const guest = await getOrderOwner();
    return Response.json(
      { orders: guest ? await listOrders(guest) : [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "订单暂时无法加载" }, { status: 503 });
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "请求来源无效" }, { status: 403 });
  const guestHash = await getGuestHash();
  const user = await getCurrentUser();
  if (!guestHash)
    return Response.json(
      { error: "访客会话尚未建立，请刷新重试" },
      { status: 401 },
    );
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "提交内容不是有效 JSON" }, { status: 400 });
  }
  const result = checkoutSchema.safeParse(body);
  if (!result.success)
    return Response.json(
      { error: "请检查商品数量、收件人、联系电话、邮箱和完整地址" },
      { status: 400 },
    );
  try {
    return Response.json(
      { order: await createOrder(result.data, guestHash, user?.id ?? null) },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof OrderError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error(
      "Order creation failed",
      error instanceof Error ? error.name : "unknown",
    );
    return Response.json(
      { error: "创建订单失败，请稍后重试" },
      { status: 503 },
    );
  }
}
