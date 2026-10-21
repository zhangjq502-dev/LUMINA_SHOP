import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
export function ProtectedRoute({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (admin && user.role !== "ADMIN")
    return (
      <div className="page-status" role="alert">
        你没有访问管理页面的权限。
      </div>
    );
  return <Outlet />;
}
