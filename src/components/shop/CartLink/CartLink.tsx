import { Link } from "react-router-dom";
import { useCart } from "../ShopProvider/ShopProvider";
export default function CartLink() {
  const { items } = useCart();
  const count = items.reduce((n, item) => n + item.quantity, 0);
  return (
    <Link
      to="/cart"
      aria-label={`购物袋，${count}件商品`}
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
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {count}
    </Link>
  );
}
