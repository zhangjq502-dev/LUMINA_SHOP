import { Link } from "react-router-dom";
import { useState } from "react";
import { useCart } from "@/components/shop/ShopProvider/ShopProvider";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import { money, type Product as ProductData } from "@/types/shop";
import localStyles from "./ProductDetail.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);

export function ProductDetail({ product }: { product: ProductData }) {
  const id = product.id;
  const { setItems } = useCart();
  const [size, setSize] = useState(
    product.sizes.includes("M") ? "M" : product.sizes[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const selectedSku = product.skus?.find((s) => s.size === size);
  const stock = selectedSku?.stock ?? 0;
  function add() {
    if (quantity > stock) return;
    setItems((items) => {
      const existing = items.find((i) => i.id === id && i.size === size);
      return existing
        ? items.map((i) =>
            i === existing
              ? { ...i, quantity: Math.min(10, stock, i.quantity + quantity) }
              : i,
          )
        : [...items, { id, size, quantity }];
    });
    setAdded(true);
  }
  return (
    <PageShell title={product.subtitle} eyebrow="CONSIDERED DETAILS">
      <div className={s.detail}>
        <div className={s.detailPhoto}>
          <img
            src={product.image}
            alt={product.subtitle}
            className="cover-image"
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className={s.productInfo}>
          <p className={s.kicker}>LUMINA / {product.category}</p>
          <h2>{product.name}</h2>
          <p className={s.muted}>{product.subtitle}</p>
          <p className={s.price}>
            {money((selectedSku?.priceCents ?? product.price * 100) / 100)}
          </p>
          <p className={s.description}>{product.description}</p>
          <p className={s.label}>颜色 · {product.color}</p>
          <span
            className={s.color}
            style={{
              background:
                id === "bag"
                  ? "#996343"
                  : id === "knit"
                    ? "#d8cbbb"
                    : "#eeeae4",
            }}
          />
          <p className={s.label}>尺码</p>
          <div className={s.sizes}>
            {product.sizes.map((v) => (
              <button
                aria-pressed={size === v}
                className={size === v ? s.selected : ""}
                onClick={() => {
                  setSize(v);
                  setAdded(false);
                }}
                key={v}
              >
                {v}
              </button>
            ))}
          </div>
          <p className={s.label}>数量 · 库存 {stock} 件</p>
          <div className={s.stepper}>
            <button
              aria-label="减少数量"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => q - 1)}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              aria-label="增加数量"
              disabled={quantity >= Math.min(10, stock)}
              onClick={() => setQuantity((q) => q + 1)}
            >
              +
            </button>
          </div>
          <button
            className={s.button}
            disabled={stock < quantity}
            onClick={add}
          >
            {stock < quantity ? "库存不足" : "加入购物袋 ↗"}
          </button>
          {added && (
            <p role="status" className={s.notice}>
              已加入购物袋。<Link to="/cart">查看购物袋 →</Link>
            </p>
          )}
          <details className={s.disclosure}>
            <summary>商品细节与护理</summary>
            <p>建议轻柔清洁，避免长时间暴晒。图片和商品资料为页面演示内容。</p>
          </details>
          <details className={s.disclosure}>
            <summary>配送与退换</summary>
            <p>本页面仅展示商城流程，无真实配送或退换服务。</p>
          </details>
        </div>
      </div>
    </PageShell>
  );
}
