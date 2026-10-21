import { Link } from "react-router-dom";
import { useCart } from "@/components/shop/ShopProvider/ShopProvider";
import localStyles from "./AccountNav.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);

export function AccountNav({ active }: { active: string }) {
  const { user } = useCart();
  return (
    <aside className={s.accountNav}>
      <div className={s.avatar}>L</div>
      <h2>{user?.name ?? "LUMINA 访客"}</h2>
      <p className={s.muted}>欢迎来到你的日常衣橱</p>
      {[
        ["/account", "账户概览"],
        ["/orders", "我的订单"],
        ["/account/addresses", "收货地址"],
        ...(user?.role === "ADMIN" ? [["/admin", "商城管理"]] : []),
        ["/login", "登录 / 注册"],
      ].map(([href, label]) => (
        <Link
          className={active === href ? s.navActive : ""}
          to={href}
          key={href}
        >
          {label}
          <span>↗</span>
        </Link>
      ))}
    </aside>
  );
}
