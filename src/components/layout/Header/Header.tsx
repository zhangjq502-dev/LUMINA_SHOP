import UserLink from "@/components/auth/UserLink";
import CartLink from "@/components/shop/CartLink";
import Link from "next/link";
import styles from "./Header.module.scss";

export default function Header() {
  return (
    <>
      <div className={styles.announcement}>
        Thoughtfully chosen. Effortlessly worn.
      </div>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo} aria-label="LUMINA 首页">
            <span aria-hidden="true">✳</span> LUMINA
          </Link>
          <nav className={styles.nav} aria-label="主导航">
            <Link href="/">HOME</Link>
            <Link href="/shop">SHOP</Link>
            <Link href="/#about">ABOUT</Link>
            <Link href="/#contact">CONTACT</Link>
          </nav>
          <div className={styles.actions}>
            <Link href="/shop" aria-label="浏览商品" className={styles.icon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
            </Link>
            <UserLink />
            <CartLink />
          </div>
        </div>
      </header>
    </>
  );
}
