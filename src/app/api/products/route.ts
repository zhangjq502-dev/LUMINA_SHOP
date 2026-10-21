import { getProducts } from "@/lib/products";
export async function GET() {
  try {
    return Response.json({ products: await getProducts() });
  } catch {
    return Response.json(
      { error: "商品暂时无法加载，请稍后重试" },
      { status: 503 },
    );
  }
}
