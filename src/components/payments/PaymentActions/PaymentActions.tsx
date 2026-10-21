import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { apiRequest } from "@/services/http";
import s from "@/styles/common.module.scss";
export default function PaymentActions({
  id,
  mode,
}: {
  id: string;
  mode: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { refresh } = useResourceRefresh("orders");
  const navigate = useNavigate();
  const location = useLocation();
  const syncing = useRef(false);
  const returned = new URLSearchParams(location.search).get("payment");
  async function action(path: string) {
    setPending(true);
    setError("");
    try {
      const data = await apiRequest<{ url?: string }>(
        `/payments/${id}/${path}`,
        { method: "POST" },
      );
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "支付失败");
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    if (
      !["stripe", "alipay"].includes(mode) ||
      returned !== "success" ||
      syncing.current
    )
      return;
    syncing.current = true;
    navigate(location.pathname, { replace: true });
    setPending(true);
    void apiRequest(`/payments/${id}/sync`, { method: "POST" })
      .then(() => refresh())
      .catch((error) =>
        setError(
          error instanceof Error
            ? error.message
            : "同步支付状态失败，请手动刷新",
        ),
      )
      .finally(() => {
        setPending(false);
        syncing.current = false;
      });
  }, [id, mode, returned, refresh, navigate, location.pathname]);
  return (
    <div>
      {returned === "cancelled" && (
        <p role="status">已返回商城。订单仍待付款，可重新支付或取消订单。</p>
      )}
      {mode === "disabled" ? (
        <p className={s.notice}>支付暂未开放，请稍后再试。</p>
      ) : (
        <>
          <p className={s.muted}>
            {mode === "demo"
              ? "本地模拟支付，仅演示订单流程，不会扣款。"
              : mode === "alipay"
                ? "支付宝官方沙箱，仅使用测试账号和虚拟资金。"
                : "Stripe 测试支付，不会产生真实扣款。"}
          </p>
          <button
            className={s.button}
            disabled={pending}
            onClick={() =>
              void action(
                mode === "demo"
                  ? "demo"
                  : mode === "alipay"
                    ? "alipay"
                    : "checkout",
              )
            }
          >
            {pending
              ? "正在处理…"
              : mode === "demo"
                ? "模拟付款"
                : mode === "alipay"
                  ? "前往支付宝沙箱付款"
                  : "前往 Stripe 测试支付"}
          </button>
          {["stripe", "alipay"].includes(mode) && (
            <button
              className={s.textButton}
              disabled={pending}
              onClick={() => void action("sync")}
            >
              刷新支付结果
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
