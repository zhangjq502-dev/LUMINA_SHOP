import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { ProductDetail } from "@/components/products/ProductDetail/ProductDetail";
import { getProduct } from "@/services/products";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { useRequest } from "@/hooks/useRequest";
import { ApiError } from "@/services/http";
import {
  LoadingState,
  ErrorState,
  NotFound,
} from "@/components/ui/RequestState/RequestState";
export default function ProductPage() {
  const { id = "" } = useParams();
  const { version, refresh } = useResourceRefresh("products");
  const load = useCallback(
    (signal: AbortSignal) => getProduct(id, signal),
    [id],
  );
  const { data, loading, error } = useRequest(load, version);
  if (error instanceof ApiError && error.status === 404) return <NotFound />;
  if (error) return <ErrorState message={error.message} retry={refresh} />;
  if (loading || !data) return <LoadingState />;
  return <ProductDetail key={id} product={data.product} />;
}
