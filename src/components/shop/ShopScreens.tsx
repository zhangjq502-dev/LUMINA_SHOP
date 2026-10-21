"use client";
import LogoutButton from "@/components/auth/LogoutButton";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { money, type Product as ProductData } from "@/types/shop";
const unitPrice = (product: ProductData, size: string) =>
  (product.skus?.find((s) => s.size === size)?.priceCents ??
    product.price * 100) / 100;
import { useCart } from "./ShopProvider";
import s from "./ShopScreens.module.scss";

export function Shell({
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
        <Link href="/">首页</Link>
        <span>/</span>
        {title}
      </div>
      <div className={s.heading}>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
      <footer className={s.footer}>
        <Link href="/">✳ LUMINA</Link>
        <span>LUMINA · 精选日常单品</span>
        <Link href="/shop">继续探索 ↗</Link>
      </footer>
    </main>
  );
}
export function Catalog() {
  const { products } = useCart();
  const categories = ["全部", ...new Set(products.map((p) => p.category))];
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const list = products
    .filter(
      (p) =>
        (category === "全部" || p.category === category) &&
        `${p.name}${p.subtitle}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "asc"
        ? a.price - b.price
        : sort === "desc"
          ? b.price - a.price
          : 0,
    );
  return (
    <Shell title="精选商品" eyebrow="THE EVERYDAY COLLECTION">
      <div className={s.intro}>为衣橱留一点空间，给真正喜欢的日常。</div>
      <div className={s.toolbar}>
        <div className={s.tabs}>
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? s.active : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          aria-label="搜索商品"
          placeholder="搜索商品…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="商品排序"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="default">精选排序</option>
          <option value="asc">价格从低到高</option>
          <option value="desc">价格从高到低</option>
        </select>
      </div>
      <p className={s.muted}>{list.length} 件精选单品</p>
      <div className={s.grid}>
        {list.map((p) => (
          <Link href={`/products/${p.id}`} className={s.card} key={p.id}>
            <div className={s.photo}>
              <Image
                src={p.image}
                alt={p.subtitle}
                loading="lazy"
                fill
                sizes="(max-width:600px) 50vw,33vw"
              />
            </div>
            <p className={s.kicker}>{p.category} / LUMINA ESSENTIALS</p>
            <h2>{p.name}</h2>
            <div className={s.row}>
              <span>{p.subtitle}</span>
              <span>{money(p.price)}</span>
            </div>
          </Link>
        ))}
      </div>
      {!list.length && (
        <div className={s.empty}>
          没有找到相关商品，试试其他关键词。
          <button
            className={s.outline}
            onClick={() => {
              setQuery("");
              setCategory("全部");
            }}
          >
            重置筛选
          </button>
        </div>
      )}
    </Shell>
  );
}
export function Product({ id }: { id: string }) {
  const { setItems, products } = useCart();
  const product = products.find((p) => p.id === id)!;
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
    <Shell title={product.subtitle} eyebrow="CONSIDERED DETAILS">
      <div className={s.detail}>
        <div className={s.detailPhoto}>
          <Image
            src={product.image}
            alt={product.subtitle}
            fill
            sizes="(max-width:700px) 100vw,50vw"
            preload
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
              已加入购物袋。<Link href="/cart">查看购物袋 →</Link>
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
    </Shell>
  );
}
function Summary({ checkout = false }: { checkout?: boolean }) {
  const { items, products } = useCart();
  const total = items.reduce(
    (n, i) =>
      n +
      unitPrice(
        products.find((p) => p.id === i.id)!,
        i.size,
      ) *
        i.quantity,
    0,
  );
  return (
    <aside className={s.summary}>
      <p className={s.kicker}>YOUR SELECTION</p>
      <h2>订单摘要</h2>
      <div className={s.row}>
        <span>商品金额</span>
        <span>{money(total)}</span>
      </div>
      <div className={s.row}>
        <span>配送费用</span>
        <span>免运费</span>
      </div>
      <div className={s.total}>
        <span>合计</span>
        <strong>{money(total)}</strong>
      </div>
      {!checkout && items.length > 0 && (
        <Link href="/checkout" className={s.button}>
          前往结算 ↗
        </Link>
      )}
      <p className={s.muted}>最终价格和库存以提交订单时的服务端校验为准</p>
      <div className={s.summaryNote}>
        精心挑选的日常单品。
        <br />
        让每一次选择，都恰到好处。
      </div>
    </aside>
  );
}
export function Cart() {
  const { items, setItems, products } = useCart();
  return (
    <Shell title="我的购物袋" eyebrow="YOUR EVERYDAY ESSENTIALS">
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
                    <Link className={s.thumb} href={`/products/${p.id}`}>
                      <Image
                        src={p.image}
                        alt={p.subtitle}
                        fill
                        sizes="120px"
                      />
                    </Link>
                    <div>
                      <p className={s.kicker}>{p.category}</p>
                      <Link href={`/products/${p.id}`} className={s.itemName}>
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
              <Link href="/shop" className={s.inlineLink}>
                ← 继续选购
              </Link>
            </>
          ) : (
            <div className={s.empty}>
              <span className={s.emptyIcon}>⌑</span>
              <h2>购物袋里，留一点期待。</h2>
              <p>去发现适合你的日常单品。</p>
              <Link href="/shop" className={s.button}>
                探索精选商品 ↗
              </Link>
            </div>
          )}
        </div>
        <Summary />
      </div>
    </Shell>
  );
}
function AccountNav({ active }: { active: string }) {
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
        ["/login", "登录 / 注册"],
      ].map(([href, label]) => (
        <Link
          className={active === href ? s.navActive : ""}
          href={href}
          key={href}
        >
          {label}
          <span>↗</span>
        </Link>
      ))}
    </aside>
  );
}
export function Account({ counts }: { counts: number[] }) {
  const { user } = useCart();
  return (
    <Shell title="我的账户" eyebrow="A SPACE THAT’S YOURS">
      <div className={s.accountLayout}>
        <AccountNav active="/account" />
        <div>
          <section className={s.welcome}>
            <p className={s.kicker}>HELLO, LUMINA GUEST</p>
            <h2>{user ? `${user.name}，欢迎回来。` : "欢迎来到 LUMINA。"}</h2>
            <p>收藏日常的美好，从这里开始。</p>
            <Link href="/shop" className={s.inlineLink}>
              发现新季精选 ↗
            </Link>
          </section>
          <div className={s.stats}>
            {[
              [String(counts[0]), "全部订单"],
              [String(counts[1]), "待付款"],
              [String(counts[2]), "运输中"],
            ].map(([n, t]) => (
              <Link href="/orders" key={t}>
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
            {user ? (
              <LogoutButton />
            ) : (
              <Link className={s.outline} href="/login">
                登录 / 注册 ↗
              </Link>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
export function Addresses() {
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState({
    name: "示例收件人",
    phone: "138 **** 0000",
    line: "上海市 · 示例区 · 示例路 100 号",
  });
  const [exists, setExists] = useState(true);
  return (
    <Shell title="收货地址" eyebrow="YOUR EVERYDAY DESTINATIONS">
      <div className={s.accountLayout}>
        <AccountNav active="/account/addresses" />
        <div>
          <p className={s.notice}>地址仅保存在当前演示页面；请使用虚构信息。</p>
          {editing ? (
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                setExists(true);
                setEditing(false);
              }}
            >
              <h2>编辑演示地址</h2>
              <label>
                收件人
                <input
                  required
                  value={address.name}
                  onChange={(e) =>
                    setAddress({ ...address, name: e.target.value })
                  }
                />
              </label>
              <label>
                联系电话
                <input
                  required
                  value={address.phone}
                  onChange={(e) =>
                    setAddress({ ...address, phone: e.target.value })
                  }
                />
              </label>
              <label>
                地址
                <input
                  required
                  value={address.line}
                  onChange={(e) =>
                    setAddress({ ...address, line: e.target.value })
                  }
                />
              </label>
              <button className={s.button}>保存演示地址</button>
              <button
                type="button"
                className={s.textButton}
                onClick={() => setEditing(false)}
              >
                取消
              </button>
            </form>
          ) : (
            <>
              {exists && (
                <div className={s.address}>
                  <span className={s.status}>默认地址</span>
                  <h2>{address.name}</h2>
                  <p>{address.phone}</p>
                  <p className={s.muted}>{address.line}</p>
                  <div className={s.row}>
                    <button
                      className={s.textButton}
                      onClick={() => setEditing(true)}
                    >
                      编辑地址
                    </button>
                    <button
                      className={s.textButton}
                      onClick={() => setExists(false)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
              <button className={s.outline} onClick={() => setEditing(true)}>
                {exists ? "修改默认地址" : "＋ 添加演示地址"}
              </button>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
