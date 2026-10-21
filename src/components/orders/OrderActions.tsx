"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "@/components/shop/ShopScreens.module.scss";
export default function OrderActions({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function cancel() {
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "取消失败");
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <button className={s.button} disabled={pending} onClick={cancel}>
        {pending ? "正在取消…" : "取消订单并归还库存"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
