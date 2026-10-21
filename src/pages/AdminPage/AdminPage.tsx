import AdminPanel from "@/components/account/AdminPanel/AdminPanel";
import { getAdminData } from "@/services/admin";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { useRequest } from "@/hooks/useRequest";
import {
  LoadingState,
  ErrorState,
} from "@/components/ui/RequestState/RequestState";
export default function AdminPage() {
  const { version, refresh } = useResourceRefresh("admin");
  const { data, loading, error } = useRequest(getAdminData, version);
  if (error) return <ErrorState message={error.message} retry={refresh} />;
  if (loading || !data) return <LoadingState />;
  return <AdminPanel orders={data.orders} products={data.products} />;
}
