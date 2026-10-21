import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useCart } from "@/components/shop/ShopProvider/ShopProvider";
import { getCartProducts } from "@/services/products";
import { useRequest } from "@/hooks/useRequest";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import {
  LoadingState,
  ErrorState,
} from "@/components/ui/RequestState/RequestState";
import type { Product } from "@/types/shop";
const Context = createContext<Product[] | null>(null);
export default function CartProductsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { items } = useCart();
  const ids = JSON.stringify([...new Set(items.map((item) => item.id))].sort());
  const { version, refresh } = useResourceRefresh("products");
  const load = useCallback(
    (signal: AbortSignal) =>
      getCartProducts(JSON.parse(ids) as string[], signal),
    [ids],
  );
  const { data, loading, error } = useRequest(load, version);
  if (error) return <ErrorState message={error.message} retry={refresh} />;
  if (loading || !data) return <LoadingState />;
  const missing = items.filter(
    (item) => !data.products.some((product) => product.id === item.id),
  );
  return (
    <Context.Provider value={data.products}>
      {missing.length > 0 && (
        <p className="request-banner" role="status">
          部分商品已下架，已从本次结算中排除。
        </p>
      )}
      {children}
    </Context.Provider>
  );
}
export function useCartProducts() {
  const products = useContext(Context);
  const cart = useCart();
  if (!products) throw new Error("CartProductsProvider required");
  return {
    ...cart,
    products,
    items: cart.items.filter((item) =>
      products.some((product) => product.id === item.id),
    ),
  };
}
