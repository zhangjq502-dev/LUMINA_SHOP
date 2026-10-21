"use client";
import Link from "next/link";
import { useCart } from "@/components/shop/ShopProvider";
export default function UserLink() {
  const { user } = useCart();
  return (
    <Link
      href={user ? "/account" : "/login"}
      aria-label={user ? `${user.name}，我的账户` : "登录或注册"}
      style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="7" r="3.5" />
        <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2Z" />
      </svg>
      {user && (
        <span
          style={{
            maxWidth: 70,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.name}
        </span>
      )}
    </Link>
  );
}
