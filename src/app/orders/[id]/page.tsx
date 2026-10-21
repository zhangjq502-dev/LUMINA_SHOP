import { getOrderOwner } from "@/lib/auth";
import OrderDetail from "@/components/orders/OrderDetail";
import { findOrder } from "@/lib/orders";
import { notFound } from "next/navigation";
export const metadata = { title: "订单详情 | LUMINA" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const guest = await getOrderOwner();
  if (!guest) notFound();
  const { id } = await params;
  const order = await findOrder(id, guest);
  if (!order) notFound();
  return <OrderDetail order={order} />;
}
