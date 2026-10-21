"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/shop/ShopProvider";
import { Shell } from "@/components/shop/ShopScreens";
import { money } from "@/types/shop";
import s from "@/components/shop/ShopScreens.module.scss";

export default function Checkout() {
  const { items, products, setItems } = useCart();
  const router = useRouter();
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
    );
    setPending(true);
    setError("");
    try {
      const session = await fetch("/api/session", { method: "POST" });
      if (!session.ok) throw new Error("无法建立访客会话，请重试");
      key.current ??= crypto.randomUUID();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key.current, items, shipping }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "提交订单失败");
      setItems([]);
      router.push(`/orders/${data.order.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "网络异常，请重试");
      setPending(false);
    }
  }
  if (!items.length)
    return (
      <Shell title="结算" eyebrow="CHECKOUT">
        <div className={s.empty}>
          <h2>购物袋中还没有商品</h2>
          <Link href="/shop" className={s.button}>
            去选购 ↗
          </Link>
        </div>
      </Shell>
    );
  return (
    <Shell title="结算" eyebrow="A FEW DETAILS, THEN YOU’RE SET">
      <p className={s.notice}>
        订单会保存至本地数据库。当前未接支付，提交后为待付款状态；学习阶段请填写虚构收货资料。
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
            <div className={s.fields}>
              <label>
                收件人
                <input
                  name="recipient"
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
                  required
                  type="email"
                  maxLength={120}
                  placeholder="demo@example.com"
                />
              </label>
              <label>
                省 / 市
                <select name="province" required defaultValue="">
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
                  ].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                区 / 县
                <input
                  name="district"
                  required
                  maxLength={60}
                  placeholder="示例区"
                />
              </label>
              <label className={s.full}>
                详细地址
                <input
                  name="address"
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
              暂未开放支付
              <span className={s.muted}>提交订单后等待付款接入</span>
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
    </Shell>
  );
}
