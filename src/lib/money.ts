import type { Product } from "@/types/shop";
// 展示价格取 SKU 的分值；下单金额仍由后端计算。
export const unitPrice = (product: Product, size: string) =>
  (product.skus?.find((s) => s.size === size)?.priceCents ??
    product.price * 100) / 100;
