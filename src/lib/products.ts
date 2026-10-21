import "server-only";
import { db } from "./db";
import type { Product } from "@/types/shop";
export async function getProducts(): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { skus: { orderBy: { id: "asc" } } },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    subtitle: p.subtitle,
    category: p.category,
    price: p.priceCents / 100,
    image: p.image,
    color: p.color,
    description: p.description,
    colors: p.colors,
    label: p.label,
    sizes: p.skus.map((s) => s.size),
    skus: p.skus.map(({ id, size, stock, priceCents }) => ({
      id,
      size,
      stock,
      priceCents,
    })),
  }));
}
