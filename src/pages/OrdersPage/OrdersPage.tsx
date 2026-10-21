import Orders from "@/components/orders/Orders/Orders";
import { getOrders } from "@/services/orders";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { useRequest } from "@/hooks/useRequest";
import {
  LoadingState,
  ErrorState,
} from "@/components/ui/RequestState/RequestState";
export default function OrdersPage() {
  const { version, refresh } = useResourceRefresh("orders");
  const { data, loading, error } = useRequest(getOrders, version);
  if (error) return <ErrorState message={error.message} retry={refresh} />;
  if (loading || !data) return <LoadingState />;
  return <Orders orders={data.orders} />;
}
