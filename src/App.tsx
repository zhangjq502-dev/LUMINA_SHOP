import { Suspense, useEffect } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import ShopProvider from "@/components/shop/ShopProvider/ShopProvider";
import Header from "@/components/layout/Header/Header";
import { routes } from "@/router/routes";
// 放在 Suspense 内，等待页面代码加载完成后再滚动到锚点。
function PageScroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
      else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}
export default function App() {
  const routeElement = useRoutes(routes);
  const { user } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${({ "/": "日常好物", "/shop": "全部商品", "/cart": "购物车", "/orders": "我的订单", "/account": "我的账户", "/login": "登录与注册" } as Record<string, string>)[pathname] ?? "商城"} | LUMINA`;
  }, [pathname]);
  return (
    <ShopProvider key={user?.id ?? "guest"} user={user}>
      <Header />
      <Suspense
        fallback={
          <div className="page-status" role="status">
            正在加载页面…
          </div>
        }
      >
        <PageScroll />
        {routeElement}
      </Suspense>
    </ShopProvider>
  );
}
