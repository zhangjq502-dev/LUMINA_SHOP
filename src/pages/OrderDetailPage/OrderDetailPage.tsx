import { useCallback } from "react";
import { useParams } from "react-router-dom";
import OrderDetail from "@/components/orders/OrderDetail/OrderDetail";
import { getOrder, getPaymentConfig } from "@/services/orders";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { useRequest } from "@/hooks/useRequest";
import { ApiError } from "@/services/http";
import {
  LoadingState,
  ErrorState,
  NotFound,
} from "@/components/ui/RequestState/RequestState";
export default function OrderDetailPage() {
  const { id = "" } = useParams();
  const { version, refresh } = useResourceRefresh("orders");
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [order, payment] = await Promise.all([
        getOrder(id, signal),
        getPaymentConfig(signal),
      ]);
      return { ...order, ...payment };
    },
    [id],
  );
  const { data, loading, error } = useRequest(load, version);
  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) return <ErrorState message={error.message} retry={refresh} />;
  if (loading || !data) return <LoadingState />;
  return (
    <OrderDetail
      order={data.order}
      paymentMode={
        data.order.paymentSessionId?.startsWith("alipay:")
          ? "alipay"
          : data.order.paymentSessionId
            ? "stripe"
            : data.mode
      }
    />
  );
}
