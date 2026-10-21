import { Product } from "@/components/shop/ShopScreens";
import { getProducts } from "@/lib/products";
import { notFound } from "next/navigation";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const products = await getProducts();
  return {
    title: `${products.find((p) => p.id === id)?.name ?? "商品未找到"} | LUMINA`,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const products = await getProducts();
  if (!products.some((p) => p.id === id)) notFound();
  return <Product id={id} />;
}
