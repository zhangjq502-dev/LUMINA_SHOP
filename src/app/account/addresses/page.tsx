import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Addresses } from "@/components/shop/ShopScreens";
export const metadata = { title: "收货地址 | LUMINA" };
export default async function Page() {
  if (!(await getCurrentUser())) redirect("/login");
  return <Addresses />;
}
