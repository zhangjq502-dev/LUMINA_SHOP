import { useCallback } from "react";
import { create } from "zustand";
type Resource = "products" | "orders" | "addresses" | "admin";
const useVersions = create<{ versions: Record<Resource, number> }>()(() => ({
  versions: { products: 0, orders: 0, addresses: 0, admin: 0 },
}));
export function invalidateResources(...resources: Resource[]) {
  useVersions.setState((state) => ({
    versions: {
      ...state.versions,
      ...Object.fromEntries(
        resources.map((key) => [key, state.versions[key] + 1]),
      ),
    },
  }));
}
// 每个业务只订阅自己的刷新版本，不再重新拉取用户或全部商品。
export function useResourceRefresh(resource: Resource) {
  const version = useVersions((state) => state.versions[resource]);
  const refresh = useCallback(() => invalidateResources(resource), [resource]);
  return { version, refresh };
}
