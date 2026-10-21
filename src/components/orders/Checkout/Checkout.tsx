import { useAuth } from "@/providers/AuthProvider";
import type { Address } from "@/services/account";
import { ensureGuestSession } from "@/services/auth";
import { createOrder, type CheckoutInput } from "@/services/orders";
import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { Link } from "react-router-dom";
import { useCartProducts } from "@/providers/CartProductsProvider";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import { money } from "@/types/shop";
import localStyles from "./Checkout.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);

export default function Checkout({
  addresses = [],
}: {
  addresses?: Address[];
}) {
  const [addressId, setAddressId] = useState(
    addresses.find((a) => a.isDefault)?.id ?? "",
  );
  const savedAddress = addresses.find((a) => a.id === addressId);
  const { items, products, setItems } = useCartProducts();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { refresh } = useResourceRefresh("orders");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);
  const total = items.reduce((n, i) => {
    const p = products.find((p) => p.id === i.id);
    const sku = p?.skus?.find((s) => s.size === i.size);
    return n + (sku?.priceCents ?? 0) * i.quantity;
  }, 0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const shipping = Object.fromEntries(
      ["recipient", "phone", "email", "province", "district", "address"].map(
        (k) => [k, String(form.get(k) ?? "")],
      ),
    ) as CheckoutInput["shipping"];
    setPending(true);
    setError("");
    try {
      await ensureGuestSession();
      key.current ??= crypto.randomUUID();
      const data = await createOrder({
        idempotencyKey: key.current,
        items,
        shipping,
      });
      setItems([]);
      navigate(`/orders/${data.order.id}`);
      refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "网络异常，请重试");
      setPending(false);
    }
  }
  if (!items.length)
    return (
      <PageShell title="结算" eyebrow="CHECKOUT">
        <div className={s.empty}>
          <h2>购物袋中还没有商品</h2>
          <Link to="/shop" className={s.button}>
            去选购 ↗
          </Link>
        </div>
      </PageShell>
    );
  return (
    <PageShell title="结算" eyebrow="A FEW DETAILS, THEN YOU’RE SET">
      <p className={s.notice}>
        订单会保存至本地数据库。提交后可选择可用的支付方式；学习阶段请填写虚构收货资料。
      </p>
      <div className={s.columns}>
        <form
          className={s.form}
          onSubmit={submit}
          onChange={() => {
            if (!pending) key.current = null;
          }}
        >
          <fieldset
            disabled={pending}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <h2>
              <span>01</span> 联系与配送
            </h2>
            {addresses.length > 0 && (
              <label>
                使用已保存地址
                <select
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}
                >
                  <option value="">手动填写</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.recipient} · {a.province} {a.district}
                      {a.isDefault ? "（默认）" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className={s.fields} key={addressId}>
              <label>
                收件人
                <input
                  name="recipient"
                  defaultValue={savedAddress?.recipient ?? ""}
                  required
                  maxLength={60}
                  autoComplete="name"
                  placeholder="示例用户"
                />
              </label>
              <label>
                联系电话
                <input
                  name="phone"
                  defaultValue={savedAddress?.phone ?? ""}
                  required
                  type="tel"
                  pattern="[+0-9 ()\-]{6,30}"
                  maxLength={30}
                  placeholder="13800000000"
                />
              </label>
              <label className={s.full}>
                邮箱
                <input
                  name="email"
                  defaultValue={user?.email ?? ""}
                  required
                  type="email"
                  maxLength={120}
                  placeholder="demo@example.com"
                />
              </label>
              <label>
                省 / 市
                <select
                  name="province"
                  required
                  defaultValue={savedAddress?.province ?? ""}
                >
                  <option value="" disabled>
                    选择地区
                  </option>
                  {[
                    "上海市",
                    "北京市",
                    "广东省",
                    "浙江省",
                    "江苏省",
                    "其他地区",
                    ...addresses
                      .map((a) => a.province)
                      .filter(
                        (p) =>
                          ![
                            "上海市",
                            "北京市",
                            "广东省",
                            "浙江省",
                            "江苏省",
                            "其他地区",
                          ].includes(p),
                      ),
                  ].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                区 / 县
                <input
                  name="district"
                  defaultValue={savedAddress?.district ?? ""}
                  required
                  maxLength={60}
                  placeholder="示例区"
                />
              </label>
              <label className={s.full}>
                详细地址
                <input
                  name="address"
                  defaultValue={savedAddress?.address ?? ""}
                  required
                  minLength={5}
                  maxLength={200}
                  placeholder="示例路 100 号"
                />
              </label>
            </div>
            <h2>
              <span>02</span> 配送方式
            </h2>
            <div className={s.option}>
              标准配送 <strong>免费</strong>
            </div>
            <h2>
              <span>03</span> 支付方式
            </h2>
            <div className={s.option}>
              提交后选择支付方式
              <span className={s.muted}>先确认订单金额与库存</span>
            </div>
            {error && (
              <p className={s.notice} role="alert">
                {error}
              </p>
            )}
            <button className={s.button} disabled={pending}>
              {pending ? "正在创建订单…" : "提交订单 ↗"}
            </button>
          </fieldset>
        </form>
        <aside className={s.summary}>
          <p className={s.kicker}>YOUR SELECTION</p>
          <h2>订单摘要</h2>
          {items.map((i) => {
            const p = products.find((p) => p.id === i.id);
            return (
              <div className={s.row} key={`${i.id}-${i.size}`}>
                <span>
                  {p?.subtitle ?? "商品不可用"} / {i.size}
                </span>
                <span>× {i.quantity}</span>
              </div>
            );
          })}
          <div className={s.row}>
            <span>配送费用</span>
            <span>免运费</span>
          </div>
          <div className={s.total}>
            <span>合计</span>
            <strong>{money(total / 100)}</strong>
          </div>
          <p className={s.muted}>服务端将重新校验价格、规格和库存。</p>
        </aside>
      </div>
    </PageShell>
  );
}
