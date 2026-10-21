import { Navigate } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm/LoginForm";
import { useAuth } from "@/providers/AuthProvider";
export default function LoginPage() {
  const { user } = useAuth();
  return user ? <Navigate to="/account" replace /> : <LoginForm />;
}
