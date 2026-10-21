import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { User } from "@/services/auth";
import { useStore } from "zustand";
import {
  createCartStore,
  cleanCart,
  mergeCart,
  type CartItem,
} from "@/stores/cart";
export type { CartItem } from "@/stores/cart";
const Context = createContext<{
  items: CartItem[];
  setItems: Dispatch<SetStateAction<CartItem[]>>;
  user: User | null;
} | null>(null);
export default function ShopProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: User | null;
}) {
  const [store] = useState(() =>
    createCartStore(`lumina-cart:${user?.id ?? "guest"}`),
  );
  const items = useStore(store, (state) => state.items);
  const setItems = useStore(store, (state) => state.setItems);
  useEffect(() => {
    let active = true;
    void (async () => {
      await store.persist.rehydrate();
      if (!active || !user) return;
      try {
        const saved = localStorage.getItem("lumina-cart:guest");
        if (saved) {
          const guest = cleanCart(JSON.parse(saved)?.state?.items);
          store.getState().setItems((current) => mergeCart(current, guest));
          localStorage.removeItem("lumina-cart:guest");
        }
      } catch {
        localStorage.removeItem("lumina-cart:guest");
      }
    })();
    return () => {
      active = false;
    };
  }, [store, user]);
  return (
    <Context.Provider
      value={{
        items,
        setItems,
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
