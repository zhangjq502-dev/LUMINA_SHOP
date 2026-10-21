import UserLink from "@/components/auth/UserLink/UserLink";
import CartLink from "@/components/shop/CartLink/CartLink";
import { Link } from "react-router-dom";
import styles from "./Header.module.scss";

export default function Header() {
  return (
    <>
      <div className={styles.announcement}>
        Thoughtfully chosen. Effortlessly worn.
      </div>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo} aria-label="LUMINA 首页">
            <span aria-hidden="true">✳</span> LUMINA
          </Link>
          <nav className={styles.nav} aria-label="主导航">
            <Link to="/">HOME</Link>
            <Link to="/shop">SHOP</Link>
            <Link to="/#about">ABOUT</Link>
            <Link to="/#contact">CONTACT</Link>
          </nav>
          <div className={styles.actions}>
            <Link to="/shop" aria-label="浏览商品" className={styles.icon}>
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
