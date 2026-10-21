import { Link } from "react-router-dom";
import { useCartProducts } from "@/providers/CartProductsProvider";
import { money } from "@/types/shop";
import { unitPrice } from "@/lib/money";
import localStyles from "./CartSummary.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);

export function CartSummary({ checkout = false }: { checkout?: boolean }) {
  const { items, products } = useCartProducts();
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
        <Link to="/checkout" className={s.button}>
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
