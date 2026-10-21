'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
export type CartItem = { id: string; size: string; quantity: number };
const initial: CartItem[] = [{ id: 'knit', size: 'M', quantity: 1 }, { id: 'bag', size: '均码', quantity: 1 }];
const Context = createContext<{ items: CartItem[]; setItems: React.Dispatch<React.SetStateAction<CartItem[]>> } | null>(null);
export default function ShopProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState(initial);
  return <Context.Provider value={{ items, setItems }}>{children}</Context.Provider>;
}
export function useCart() { const value = useContext(Context); if (!value) throw new Error('ShopProvider required'); return value; }
