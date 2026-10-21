import CartProductsProvider from "@/providers/CartProductsProvider";
import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { NotFound } from "@/components/ui/RequestState/RequestState";

const HomePage = lazy(() => import("@/pages/HomePage/HomePage"));
const ProductPage = lazy(() => import("@/pages/ProductPage/ProductPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage/AccountPage"));
const AddressesPage = lazy(() => import("@/pages/AddressesPage/AddressesPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage/CheckoutPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage/OrdersPage"));
const OrderDetailPage = lazy(
  () => import("@/pages/OrderDetailPage/OrderDetailPage"),
);
const AdminPage = lazy(() => import("@/pages/AdminPage/AdminPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage/LoginPage"));
const RecoveryPage = lazy(() => import("@/pages/RecoveryPage/RecoveryPage"));
const ShopPage = lazy(() => import("@/pages/ShopPage/ShopPage"));
const CartPage = lazy(() => import("@/pages/CartPage/CartPage"));

// 页面地址和组件统一在这里维护；权限路由的子页面通过 Outlet 显示。
export const routes: RouteObject[] = [
  // 公开页面（订单接口仍由后端校验用户或访客身份）。
  { path: "/", element: <HomePage /> },
  { path: "/shop", element: <ShopPage /> },
  { path: "/products/:id", element: <ProductPage /> },
  {
    path: "/cart",
    element: (
      <CartProductsProvider>
        <CartPage />
      </CartProductsProvider>
    ),
  },
  {
    path: "/checkout",
    element: (
      <CartProductsProvider>
        <CheckoutPage />
      </CartProductsProvider>
    ),
  },
  { path: "/orders", element: <OrdersPage /> },
  { path: "/orders/:id", element: <OrderDetailPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <RecoveryPage mode="forgot" /> },
  { path: "/reset-password", element: <RecoveryPage mode="reset" /> },
  { path: "/verify-email", element: <RecoveryPage mode="verify" /> },
  // 登录后可访问。
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/account", element: <AccountPage /> },
      { path: "/account/addresses", element: <AddressesPage /> },
    ],
  },
  // 管理员可访问。
  {
    element: <ProtectedRoute admin />,
    children: [{ path: "/admin", element: <AdminPage /> }],
  },
  { path: "*", element: <NotFound /> },
];
