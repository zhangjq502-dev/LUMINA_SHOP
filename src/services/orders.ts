import { apiRequest } from "./http";
import type { Order } from "@/types/shop";
export type CheckoutInput = {
  idempotencyKey: string;
  items: { id: string; size: string; quantity: number }[];
  shipping: {
    recipient: string;
    phone: string;
    email: string;
    province: string;
    district: string;
    address: string;
  };
};
export function createOrder(input: CheckoutInput) {
  return apiRequest<{ order: Order }>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function cancelOrder(id: string) {
  return apiRequest<{ order: Order }>(`/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel" }),
  });
}

export const getOrders = (signal?: AbortSignal) =>
  apiRequest<{ orders: Order[] }>("/orders", { signal });
export const getOrder = (id: string, signal?: AbortSignal) =>
  apiRequest<{ order: Order }>(`/orders/${encodeURIComponent(id)}`, { signal });
export const getPaymentConfig = (signal?: AbortSignal) =>
  apiRequest<{ mode: string }>("/payments/config", { signal });
