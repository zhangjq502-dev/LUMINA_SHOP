import { useState, type FormEvent } from "react";
import {
  invalidateResources,
  useResourceRefresh,
} from "@/hooks/useResourceRefresh";
import { apiRequest } from "@/services/http";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import { money, orderLabels, type Order } from "@/types/shop";
import s from "@/styles/common.module.scss";
type AdminProduct = {
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
  skus: { id: string; size: string; stock: number }[];
};
export default function AdminPanel({
  orders,
  products,
}: {
  orders: Order[];
  products: AdminProduct[];
}) {
  const [tab, setTab] = useState("orders");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const { refresh } = useResourceRefresh("admin");
  async function save(path: string, data: unknown, method = "PATCH") {
    setPending(true);
    setMessage("");
    try {
      await apiRequest(`/admin/${path}`, {
        method,
        body: JSON.stringify(data),
      });
      setMessage("操作成功");
      invalidateResources(path.startsWith("orders/") ? "orders" : "products");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPending(false);
    }
  }
  function ship(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void save(`orders/${id}/ship`, {
      carrier: f.get("carrier"),
      trackingNumber: f.get("trackingNumber"),
    });
  }
  function product(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void save(`products/${id}`, {
      name: f.get("name"),
      priceCents: Math.round(Number(f.get("price")) * 100),
      active: f.get("active") === "on",
    });
  }
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void save(
      "products",
      {
        id: f.get("id"),
        name: f.get("name"),
        subtitle: f.get("subtitle"),
        category: f.get("category"),
        priceCents: Math.round(Number(f.get("price")) * 100),
        image: f.get("image"),
        color: f.get("color"),
        description: f.get("description"),
        sizes: String(f.get("sizes"))
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        stock: Number(f.get("stock")),
      },
      "POST",
    );
  }
  return (
    <PageShell title="商城管理" eyebrow="LUMINA OPERATIONS">
      <div className={s.tabs}>
        {[
          ["orders", "订单发货"],
          ["products", "商品与库存"],
          ["new", "新增商品"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? s.active : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p className={s.notice} role="status">
          {message}
        </p>
      )}
      {tab === "orders" ? (
        <>
          <p className={s.muted}>最近 100 笔订单。只有已付款订单可以发货。</p>
          {orders.map((order) => (
            <article
              key={order.id}
              className={s.panel}
              style={{ margin: "20px 0" }}
            >
              <p>
                {order.number} · {orderLabels[order.status]} ·{" "}
                {money(order.totalCents / 100)}
              </p>
              <p>
                {order.recipient} · {order.province} {order.district}{" "}
                {order.address}
              </p>
              {order.status === "PAID" && (
                <form onSubmit={(e) => ship(e, order.id)} className={s.form}>
                  <label>
                    承运商
                    <input name="carrier" maxLength={60} required />
                  </label>
                  <label>
                    物流单号
                    <input name="trackingNumber" maxLength={80} required />
                  </label>
                  <button className={s.outline} disabled={pending}>
                    确认发货
                  </button>
                </form>
              )}
            </article>
          ))}
        </>
      ) : tab === "products" ? (
        products.map((p) => (
          <details key={p.id} className={s.disclosure}>
            <summary>
              {p.name} · {money(p.priceCents / 100)} ·{" "}
              {p.active ? "在售" : "已下架"}
            </summary>
            <form className={s.form} onSubmit={(e) => product(e, p.id)}>
              <label>
                名称
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={p.name}
                />
              </label>
              <label>
                价格（元）
                <input
                  name="price"
                  type="number"
                  required
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  defaultValue={p.priceCents / 100}
                />
              </label>
              <label style={{ flexDirection: "row" }}>
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={p.active}
                />
                上架销售
              </label>
              <button className={s.outline} disabled={pending}>
                保存商品
              </button>
            </form>
            {p.skus.map((sku) => (
              <form
                key={sku.id}
                className={s.row}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void save(`skus/${sku.id}`, {
                    addStock: Number(f.get("stock")),
                  });
                }}
              >
                <span>
                  {sku.size} · 库存 {sku.stock}
                </span>
                <input
                  name="stock"
                  type="number"
                  min={1}
                  max={10000}
                  defaultValue={1}
                  aria-label={`补货 ${sku.size}`}
                  style={{ width: 90 }}
                />
                <button className={s.outline} disabled={pending}>
                  补货
                </button>
              </form>
            ))}
          </details>
        ))
      ) : (
        <form
          onSubmit={create}
          className={s.form}
          style={{ maxWidth: 600, marginTop: 30 }}
        >
          {[
            ["id", "商品编号（小写英文/数字/短横线）"],
            ["name", "英文名称"],
            ["subtitle", "商品中文名"],
            ["category", "分类"],
            ["color", "颜色"],
            ["description", "描述"],
            ["sizes", "尺码，用英文逗号分隔"],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                required
                maxLength={name === "description" ? 1000 : 100}
              />
            </label>
          ))}
          <label>
            价格（元）
            <input
              name="price"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              required
            />
          </label>
          <label>
            每规格初始库存
            <input
              name="stock"
              type="number"
              min={0}
              max={10000}
              defaultValue={20}
              required
            />
          </label>
          <label>
            图片
            <select name="image">
              {[
                "tee",
                "knit",
                "bag",
                "shirt",
                "jeans",
                "sneakers",
                "coat",
                "backpack",
              ].map((image) => (
                <option key={image} value={`/images/${image}.jpg`}>
                  {image}
                </option>
              ))}
            </select>
          </label>
          <button className={s.button} disabled={pending}>
            创建商品
          </button>
        </form>
      )}
    </PageShell>
  );
}
