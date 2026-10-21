import { apiRequest } from "./http";
import type { Product } from "@/types/shop";
export const getProduct = (id: string, signal?: AbortSignal) =>
  apiRequest<{ product: Product }>(`/products/${encodeURIComponent(id)}`, {
    signal,
  });

export type ProductPageResult = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
};
export function getProductPage(params: URLSearchParams, signal?: AbortSignal) {
  return apiRequest<ProductPageResult>(`/products/paginated?${params}`, {
    signal,
  });
}

export const getFeaturedProducts = (signal?: AbortSignal) =>
  getProductPage(new URLSearchParams({ pageSize: "6" }), signal);
export const getCartProducts = (ids: string[], signal?: AbortSignal) =>
  ids.length
    ? apiRequest<{ products: Product[] }>(
        `/products/batch?ids=${encodeURIComponent(JSON.stringify(ids))}`,
        { signal },
      )
    : Promise.resolve({ products: [] as Product[] });
