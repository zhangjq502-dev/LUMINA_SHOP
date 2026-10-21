import { getProducts } from "@/lib/products";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = (await getProducts()).find((p) => p.id === id);
    return product
      ? Response.json({ product })
      : Response.json({ error: "商品不存在" }, { status: 404 });
  } catch {
    return Response.json({ error: "商品暂时无法加载" }, { status: 503 });
  }
}
