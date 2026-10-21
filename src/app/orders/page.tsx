import { getOrderOwner } from "@/lib/auth";
import Orders from "@/components/orders/Orders";
import { listOrders } from "@/lib/orders";
export const metadata = { title: "我的订单 | LUMINA" };
export default async function Page() {
  const guest = await getOrderOwner();
  return <Orders orders={guest ? await listOrders(guest) : []} />;
}
