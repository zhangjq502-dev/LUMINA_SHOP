import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { useCallback } from "react";
import Checkout from "@/components/orders/Checkout/Checkout";
import { getAddresses } from "@/services/account";
import { useAuth } from "@/providers/AuthProvider";
import { useRequest } from "@/hooks/useRequest";
import {
  LoadingState,
  ErrorState,
} from "@/components/ui/RequestState/RequestState";
export default function CheckoutPage() {
  const { user } = useAuth();
  const { version, refresh } = useResourceRefresh("addresses");
  const load = useCallback(
    (signal: AbortSignal) =>
      user ? getAddresses(signal) : Promise.resolve({ addresses: [] }),
    [user],
  );
  const { data, loading, error } = useRequest(load, version);
  if (error) return <ErrorState message={error.message} retry={refresh} />;
  if (loading || !data) return <LoadingState />;
  return <Checkout addresses={data.addresses} />;
}
