import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useRequest } from "@/hooks/useRequest";
import { useState } from "react";
import { getCurrentUser, type User } from "@/services/auth";
const loadAuth = (signal: AbortSignal) => getCurrentUser(signal);
type Auth = {
  user: User | null;
  version: number;
  refresh: () => void;
  setUser: (user: User | null) => void;
};
const Context = createContext<Auth | null>(null);
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const { data, loading, error, setData } = useRequest(loadAuth, version);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  // 登录/退出后立即更新界面；随后 refresh 再向后端确认身份。
  const setUser = (user: User | null) =>
    setData((previous) => ({ ...previous, user }));
  const user = data?.user ?? null;
  const value = {
    user,
    version,
    refresh,
    setUser,
  };
  if (!data)
    return (
      <main className="page-status" role={error ? "alert" : "status"}>
        <h1>LUMINA</h1>
        <p>
          {error
            ? "无法确认登录状态，请确认后端服务已启动。"
            : "正在确认登录状态…"}
        </p>
        {error && <button onClick={refresh}>重新加载</button>}
      </main>
    );
  return (
    <Context.Provider value={value}>
      {error && (
        <div className="request-banner" role="alert">
          更新数据失败，<button onClick={refresh}>点击重试</button>
        </div>
      )}
      {loading && (
        <div className="refresh-indicator" role="status">
          正在更新…
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider required");
  return value;
}
