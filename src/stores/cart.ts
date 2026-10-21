import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Dispatch, SetStateAction } from "react";
export type CartItem = { id: string; size: string; quantity: number };
export function cleanCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 100)
    .filter(
      (i): i is CartItem =>
        !!i &&
        typeof i.id === "string" &&
        typeof i.size === "string" &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0 &&
        i.quantity <= 10,
    )
    .map(({ id, size, quantity }) => ({ id, size, quantity }));
}
export function mergeCart(a: CartItem[], b: CartItem[]) {
  const items = new Map<string, CartItem>();
  for (const item of [...a, ...b]) {
    const key = JSON.stringify([item.id, item.size]);
    items.set(key, {
      ...item,
      quantity: Math.min(10, (items.get(key)?.quantity ?? 0) + item.quantity),
    });
  }
  return [...items.values()];
}
export function createCartStore(name: string) {
  return createStore<{
    items: CartItem[];
    setItems: Dispatch<SetStateAction<CartItem[]>>;
  }>()(
    persist(
      (set) => ({
        items: [],
        setItems: (update) =>
          set((state) => ({
            items: cleanCart(
              typeof update === "function" ? update(state.items) : update,
            ),
          })),
      }),
      {
        name,
        storage: createJSONStorage(() => localStorage),
        skipHydration: true,
        partialize: (state) => ({ items: state.items }),
        merge: (saved, current) => ({
          ...current,
          items: cleanCart((saved as { items?: unknown } | null)?.items),
        }),
      },
    ),
  );
}
