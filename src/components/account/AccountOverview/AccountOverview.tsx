import { useAuth } from "@/providers/AuthProvider";
import ProfileEditor from "../ProfileEditor/ProfileEditor";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import { AccountNav } from "../AccountNav/AccountNav";
import LogoutButton from "@/components/auth/LogoutButton/LogoutButton";
import localStyles from "./AccountOverview.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);

export function AccountOverview({ counts }: { counts: number[] }) {
  const { user } = useAuth();
  return (
    <PageShell title="我的账户" eyebrow="A SPACE THAT’S YOURS">
      <div className={s.accountLayout}>
        <AccountNav active="/account" />
        <div>
          <section className={s.welcome}>
            <p className={s.kicker}>HELLO, LUMINA GUEST</p>
            <h2>{user ? `${user.name}，欢迎回来。` : "欢迎来到 LUMINA。"}</h2>
            <p>收藏日常的美好，从这里开始。</p>
            <Link to="/shop" className={s.inlineLink}>
              发现新季精选 ↗
            </Link>
          </section>
          <div className={s.stats}>
            {[
              [String(counts[0]), "全部订单"],
              [String(counts[1]), "待付款"],
              [String(counts[2]), "运输中"],
            ].map(([n, t]) => (
              <Link to="/orders" key={t}>
                <strong>{n}</strong>
                <span>{t}</span>
              </Link>
            ))}
          </div>
          <div className={s.panel}>
            <h2>账户资料</h2>
            <div className={s.row}>
              <span>昵称</span>
              <span>{user?.name ?? "LUMINA 访客"}</span>
            </div>
            <div className={s.row}>
              <span>邮箱</span>
              <span>{user?.email ?? "未登录"}</span>
            </div>
            <p className={s.muted}>
              {user
                ? "订单已关联当前账户，换一台设备登录也可以查看。"
                : "当前以访客身份浏览，登录后可以保存订单归属。"}
            </p>
            <ProfileEditor />
            {user ? (
              <LogoutButton />
            ) : (
              <Link className={s.outline} to="/login">
                登录 / 注册 ↗
              </Link>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
