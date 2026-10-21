import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import localStyles from "./PageShell.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);

export function PageShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className={s.page}>
      <div className={s.breadcrumb}>
        <Link to="/">首页</Link>
        <span>/</span>
        {title}
      </div>
      <div className={s.heading}>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
      <footer className={s.footer}>
        <Link to="/">✳ LUMINA</Link>
        <span>LUMINA · 精选日常单品</span>
        <Link to="/shop">继续探索 ↗</Link>
      </footer>
    </main>
  );
}
