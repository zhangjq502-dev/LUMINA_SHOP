import { Link } from "react-router-dom";
import { useCartProducts } from "@/providers/CartProductsProvider";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import { CartSummary } from "../../components/cart/CartSummary/CartSummary";
import { money } from "@/types/shop";
import { unitPrice } from "@/lib/money";
import localStyles from "./CartPage.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);

export default function CartPage() {
  const { items, setItems, products } = useCartProducts();
  return (
    <PageShell title="我的购物袋" eyebrow="YOUR EVERYDAY ESSENTIALS">
      <div className={s.columns}>
        <div>
          {items.length ? (
            <>
              <div className={s.listHeader}>
                商品清单{" "}
                <span>{items.reduce((n, i) => n + i.quantity, 0)} 件商品</span>
              </div>
              {items.map((item) => {
                const p = products.find((p) => p.id === item.id)!;
                return (
                  <article
                    className={s.cartItem}
                    key={`${item.id}-${item.size}`}
                  >
                    <Link className={s.thumb} to={`/products/${p.id}`}>
                      <img
                        src={p.image}
                        alt={p.subtitle}
                        className="cover-image"
                        loading="lazy"
                      />
                    </Link>
                    <div>
                      <p className={s.kicker}>{p.category}</p>
                      <Link to={`/products/${p.id}`} className={s.itemName}>
                        {p.name}
                      </Link>
                      <p className={s.muted}>
                        {p.color} / {item.size}
                      </p>
                      <div className={s.stepper}>
                        <button
                          aria-label={`减少${p.subtitle}数量`}
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            setItems(
                              items.map((i) =>
                                i === item
                                  ? { ...i, quantity: i.quantity - 1 }
                                  : i,
                              ),
                            )
                          }
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          aria-label={`增加${p.subtitle}数量`}
                          disabled={item.quantity >= 10}
                          onClick={() =>
                            setItems(
                              items.map((i) =>
                                i === item
                                  ? { ...i, quantity: i.quantity + 1 }
                                  : i,
                              ),
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className={s.itemEnd}>
                      <strong>
                        {money(unitPrice(p, item.size) * item.quantity)}
                      </strong>
                      <button
                        className={s.textButton}
                        onClick={() =>
                          setItems(items.filter((i) => i !== item))
                        }
                      >
                        移除
                      </button>
                    </div>
                  </article>
                );
              })}
              <Link to="/shop" className={s.inlineLink}>
                ← 继续选购
              </Link>
            </>
          ) : (
            <div className={s.empty}>
              <span className={s.emptyIcon}>⌑</span>
              <h2>购物袋里，留一点期待。</h2>
              <p>去发现适合你的日常单品。</p>
              <Link to="/shop" className={s.button}>
                探索精选商品 ↗
              </Link>
            </div>
          )}
        </div>
        <CartSummary />
      </div>
    </PageShell>
  );
}
