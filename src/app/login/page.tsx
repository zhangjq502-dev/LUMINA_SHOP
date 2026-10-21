import LoginForm from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
export const metadata = { title: "登录与注册 | LUMINA" };
export default async function Page() {
  if (await getCurrentUser()) redirect("/account");
  return <LoginForm />;
}
