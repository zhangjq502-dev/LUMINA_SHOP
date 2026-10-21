"use client";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Product } from "@/types/shop";
export type CartItem = { id: string; size: string; quantity: number };
const Context = createContext<{
  items: CartItem[];
  setItems: Dispatch<SetStateAction<CartItem[]>>;
  products: Product[];
  user: { id: string; name: string; email: string } | null;
} | null>(null);
export default function ShopProvider({
  children,
  products,
  user,
}: {
  children: ReactNode;
  products: Product[];
  user: { id: string; name: string; email: string } | null;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  return (
    <Context.Provider
      value={{
        items: items.filter((item) => products.some((p) => p.id === item.id)),
        setItems,
        products,
        user,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error("ShopProvider required");
  return value;
}
