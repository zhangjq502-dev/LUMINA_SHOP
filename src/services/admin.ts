import { apiRequest } from "./http";
import type { ComponentProps } from "react";
import type AdminPanel from "@/components/account/AdminPanel/AdminPanel";
type AdminData = ComponentProps<typeof AdminPanel>;
export async function getAdminData(signal?: AbortSignal): Promise<AdminData> {
  const [orders, products] = await Promise.all([
    apiRequest<Pick<AdminData, "orders">>("/admin/orders", { signal }),
    apiRequest<Pick<AdminData, "products">>("/admin/products", { signal }),
  ]);
  return { ...orders, ...products };
}
