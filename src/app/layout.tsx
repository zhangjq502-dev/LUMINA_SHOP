import { getCurrentUser } from "@/lib/auth";
import { getProducts } from "@/lib/products";
import type { Metadata } from "next";
import "./globals.css";
import ShopProvider from "@/components/shop/ShopProvider";
import Header from "@/components/layout/Header/Header";

export const metadata: Metadata = {
  title: "LUMINA — Considered essentials",
  description: "简约设计，日常穿搭。探索 LUMINA 精选服饰与配件。",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [products, user] = await Promise.all([getProducts(), getCurrentUser()]);
  return (
    <html lang="zh-CN">
      <body>
        <ShopProvider products={products} user={user}>
          <Header />
          {children}
        </ShopProvider>
      </body>
    </html>
  );
}
