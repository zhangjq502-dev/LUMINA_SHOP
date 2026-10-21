import { useSearchParams } from "react-router-dom";
import RecoveryForm from "@/components/auth/RecoveryForm/RecoveryForm";
export default function RecoveryPage({
  mode,
}: {
  mode: "forgot" | "reset" | "verify";
}) {
  const [params] = useSearchParams();
  return <RecoveryForm mode={mode} token={params.get("token") ?? ""} />;
}
