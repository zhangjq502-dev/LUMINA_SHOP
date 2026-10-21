import { useState } from "react";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { apiRequest } from "@/services/http";
import s from "@/styles/common.module.scss";
export default function ConfirmReceipt({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { refresh } = useResourceRefresh("orders");
  async function confirm() {
    setPending(true);
    try {
      await apiRequest(`/orders/${id}/confirm`, { method: "POST" });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "确认失败");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <button
        className={s.button}
        disabled={pending}
        onClick={() => void confirm()}
      >
        {pending ? "正在处理…" : "确认收货"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
