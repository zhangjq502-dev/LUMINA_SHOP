import { AccountOverview } from "@/components/account/AccountOverview/AccountOverview";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { useRequest } from "@/hooks/useRequest";
import { getOrders } from "@/services/orders";
import {
  LoadingState,
  ErrorState,
} from "@/components/ui/RequestState/RequestState";
export default function AccountPage() {
  const { version, refresh } = useResourceRefresh("orders");
  const { data, loading, error } = useRequest(getOrders, version);
  if (error) return <ErrorState message={error.message} retry={refresh} />;
  if (loading || !data) return <LoadingState />;
  const { orders } = data;
  return (
    <AccountOverview
      counts={[
        orders.length,
        orders.filter((o) => o.status === "PENDING_PAYMENT").length,
        orders.filter((o) => o.status === "SHIPPED").length,
      ]}
    />
  );
}
