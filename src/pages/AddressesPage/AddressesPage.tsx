import { Addresses } from "@/components/account/Addresses/Addresses";
import { getAddresses } from "@/services/account";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { useRequest } from "@/hooks/useRequest";
import {
  LoadingState,
  ErrorState,
} from "@/components/ui/RequestState/RequestState";
export default function AddressesPage() {
  const { version, refresh } = useResourceRefresh("addresses");
  const { data, loading, error } = useRequest(getAddresses, version);
  if (error) return <ErrorState message={error.message} retry={refresh} />;
  if (loading || !data) return <LoadingState />;
  return <Addresses addresses={data.addresses} />;
}
