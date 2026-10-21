import { logout as logoutAccount } from "@/services/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import s from "@/styles/common.module.scss";
export default function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { refresh, setUser } = useAuth();
  async function logout() {
    setPending(true);
    setError("");
    try {
      await logoutAccount();
      setUser(null);
      navigate("/login", { replace: true });
      refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "网络异常");
      setPending(false);
    }
  }
  return (
    <>
      <button className={s.outline} disabled={pending} onClick={logout}>
        {pending ? "正在退出…" : "退出登录"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
