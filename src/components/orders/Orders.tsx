"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shell } from "@/components/shop/ShopScreens";
import { orderLabels, money, type Order } from "@/types/shop";
import s from "@/components/shop/ShopScreens.module.scss";
export default function Orders({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState("ALL");
  const visible = orders.filter((o) => filter === "ALL" || o.status === filter);
  return (
    <Shell title="我的订单" eyebrow="YOUR LUMINA JOURNEY">
      <p className={s.muted}>
        显示当前浏览器访客会话创建的订单。清除 Cookie
        后无法继续查看，后续可接入用户登录。
      </p>
      <div className={s.tabs}>
        {[["ALL", "全部"], ...Object.entries(orderLabels)].map(
          ([status, label]) => (
            <button
              key={status}
              className={filter === status ? s.active : ""}
              onClick={() => setFilter(status)}
            >
              {label}
            </button>
          ),
        )}
      </div>
      {!visible.length ? (
        <div className={s.empty}>
          <h2>还没有{filter === "ALL" ? "" : orderLabels[filter]}订单</h2>
          <p>选一件喜欢的单品，开启你的 LUMINA 日常。</p>
          <Link href="/shop" className={s.button}>
            浏览商品 ↗
          </Link>
        </div>
      ) : (
        visible.map((order) => (
          <article className={s.order} key={order.id}>
            <div className={s.orderTop}>
              <span>
                {new Date(order.createdAt).toLocaleDateString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}
                <span className={s.orderId}>/ {order.number}</span>
              </span>
              <span className={s.status}>{orderLabels[order.status]}</span>
            </div>
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
            <div className={s.orderBottom}>
              <span>
                共 {order.items.reduce((n, i) => n + i.quantity, 0)} 件商品 ·
                合计 {money(order.totalCents / 100)}
              </span>
              <Link href={`/orders/${order.id}`} className={s.outline}>
                订单详情 →
              </Link>
            </div>
          </article>
        ))
      )}
    </Shell>
  );
}
