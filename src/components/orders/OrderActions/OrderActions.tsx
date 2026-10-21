import { cancelOrder } from "@/services/orders";
import { useState } from "react";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import s from "@/styles/common.module.scss";
export default function OrderActions({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { refresh } = useResourceRefresh("orders");
  async function cancel() {
    setPending(true);
    setError("");
    try {
      await cancelOrder(id);
      refresh();
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
