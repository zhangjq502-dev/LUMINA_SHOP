import OrderActions from "./OrderActions";
import Link from "next/link";
import Image from "next/image";
import { Shell } from "@/components/shop/ShopScreens";
import { money, orderLabels, type Order } from "@/types/shop";
import s from "@/components/shop/ShopScreens.module.scss";
export default function OrderDetail({ order }: { order: Order }) {
  return (
    <Shell title="订单详情" eyebrow="THE DETAILS OF YOUR ORDER">
      <Link href="/orders" className={s.inlineLink}>
        ← 我的订单
      </Link>
      <div className={s.orderHero}>
        <span className={s.status}>{orderLabels[order.status]}</span>
        <h2>
          {order.status === "PENDING_PAYMENT"
            ? "订单已创建，等待付款。"
            : order.status === "CANCELLED"
              ? "订单已取消，库存已归还。"
              : "每一份期待，都值得用心对待。"}
        </h2>
        <p className={s.muted}>
          {order.number} ·{" "}
          {new Date(order.createdAt).toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
          })}
        </p>
        {order.status === "PENDING_PAYMENT" && (
          <p className={s.notice}>
            尚未接入支付渠道，本订单未付款。可以取消待付款订单，库存将自动归还。
          </p>
        )}
      </div>
      <div className={s.columns}>
        <section className={s.panel}>
          <h2>商品信息</h2>
          {order.items.map((item) => (
            <div className={s.cartItem} key={item.id}>
              <Link href={`/products/${item.productId}`} className={s.thumb}>
                <Image
                  src={item.image}
                  alt={item.subtitle}
                  fill
                  sizes="100px"
                />
              </Link>
              <div>
                <h3>{item.name}</h3>
                <p className={s.muted}>
                  {item.color} / {item.size} / × {item.quantity}
                </p>
                <strong>{money(item.unitPriceCents / 100)}</strong>
              </div>
            </div>
          ))}
          <h2>收货信息</h2>
          <p className={s.description}>
            {order.recipient} · {order.phone}
            <br />
            {order.province} · {order.district} · {order.address}
            <br />
            {order.email}
          </p>
        </section>
        <aside className={s.summary}>
          <h2>金额明细</h2>
          <div className={s.row}>
            <span>商品金额</span>
            <span>{money((order.totalCents - order.shippingCents) / 100)}</span>
          </div>
          <div className={s.row}>
            <span>运费</span>
            <span>{money(order.shippingCents / 100)}</span>
          </div>
          <div className={s.total}>
            <span>订单金额</span>
            <strong>{money(order.totalCents / 100)}</strong>
          </div>
          <p className={s.muted}>
            {order.status === "PENDING_PAYMENT"
              ? "待付款 · 尚未扣款"
              : orderLabels[order.status]}
          </p>
          {order.status === "PENDING_PAYMENT" && <OrderActions id={order.id} />}
          <Link href="/shop" className={s.outline}>
            继续选购 ↗
          </Link>
        </aside>
      </div>
    </Shell>
  );
}
