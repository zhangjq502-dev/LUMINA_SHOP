import type { ReactNode } from "react";
import { PageShell } from "../PageShell/PageShell";
export function LoadingState() {
  return (
    <div className="page-status" role="status">
      正在加载…
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="page-status" role="alert">
      <p>{message}</p>
      <button onClick={retry}>重试</button>
    </div>
  );
}
export function NotFound() {
  return (
    <PageShell title="页面不存在" eyebrow="PAGE NOT FOUND">
      <div className="page-status">
        <p>该页面或商品不存在。</p>
        <a href="/">返回首页 →</a>
      </div>
    </PageShell>
  );
}
export function PageError({ children }: { children: ReactNode }) {
  return <div className="page-status">{children}</div>;
}
