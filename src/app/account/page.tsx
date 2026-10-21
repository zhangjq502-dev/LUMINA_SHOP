import { redirect } from "next/navigation";
import { getCurrentUser, getOrderOwner } from "@/lib/auth";
import { Account } from "@/components/shop/ShopScreens";
import { listOrders } from "@/lib/orders";
export const metadata = { title: "我的账户 | LUMINA" };
export default async function Page() {
  if (!(await getCurrentUser())) redirect("/login");
  const guest = await getOrderOwner();
  const orders = guest ? await listOrders(guest) : [];
  return (
    <Account
      counts={[
        orders.length,
        orders.filter((o) => o.status === "PENDING_PAYMENT").length,
        orders.filter((o) => o.status === "SHIPPED").length,
      ]}
    />
  );
}
