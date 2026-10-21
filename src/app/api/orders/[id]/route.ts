import { getOrderOwner } from "@/lib/auth";
import { sameOrigin } from "@/lib/guest";
import { findOrder, cancelOrder, OrderError } from "@/lib/orders";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guest = await getOrderOwner();
    if (!guest) return Response.json({ error: "订单不存在" }, { status: 404 });
    const { id } = await params;
    const order = await findOrder(id, guest);
    return order
      ? Response.json(
          { order },
          { headers: { "Cache-Control": "private, no-store" } },
        )
      : Response.json({ error: "订单不存在" }, { status: 404 });
  } catch {
    return Response.json({ error: "订单暂时无法加载" }, { status: 503 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request))
    return Response.json({ error: "请求来源无效" }, { status: 403 });
  const guest = await getOrderOwner();
  if (!guest) return Response.json({ error: "订单不存在" }, { status: 404 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "无效请求" }, { status: 400 });
  }
  if (body?.action !== "cancel")
    return Response.json({ error: "不支持的操作" }, { status: 400 });
  try {
    const { id } = await params;
    return Response.json(
      { order: await cancelOrder(id, guest) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof OrderError ? error.message : "取消失败，请重试",
      },
      { status: error instanceof OrderError ? error.status : 503 },
    );
  }
}
