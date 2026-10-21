"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/ShopProvider";
import s from "@/components/shop/ShopScreens.module.scss";
export default function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setItems } = useCart();
  async function logout() {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("退出失败，请重试");
      setItems([]);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "网络异常");
      setPending(false);
    }
  }
  return (
    <>
      <button className={s.outline} disabled={pending} onClick={logout}>
        {pending ? "正在退出…" : "退出登录"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
