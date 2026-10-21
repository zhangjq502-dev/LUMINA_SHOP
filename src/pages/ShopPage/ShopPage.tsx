import { Link, useSearchParams } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { useRequest } from "@/hooks/useRequest";
import { getProductPage } from "@/services/products";
import { ErrorState } from "@/components/ui/RequestState/RequestState";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import { money } from "@/types/shop";
import localStyles from "./ShopPage.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "default";
  const query = params.toString();
  const { version, refresh } = useResourceRefresh("products");
  const load = useCallback(
    (signal: AbortSignal) => getProductPage(new URLSearchParams(query), signal),
    [query],
  );
  const { data, loading, error } = useRequest(load, version);
  const categories = ["全部", ...(data?.categories ?? [])];
  const list = data?.products ?? [];
  function update(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });
  }
  // 只有停止输入 350ms 后才请求；筛选变化回到第一页，刷新/返回仍保留 URL 条件。
  useEffect(() => {
    setDraft(params.get("q") ?? "");
  }, [params]);
  useEffect(() => {
    if (draft === (params.get("q") ?? "")) return;
    const timer = setTimeout(
      () =>
        setParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (draft.trim()) next.set("q", draft.trim());
            else next.delete("q");
            next.delete("page");
            return next;
          },
          { replace: true },
        ),
      350,
    );
    return () => clearTimeout(timer);
  }, [draft, params, setParams]);
  return (
    <PageShell title="精选商品" eyebrow="THE EVERYDAY COLLECTION">
      <div className={s.intro}>为衣橱留一点空间，给真正喜欢的日常。</div>
      <div className={s.toolbar}>
        <div className={s.tabs}>
          {categories.map((c) => (
            <button
              key={c}
              className={(category || "全部") === c ? s.active : ""}
              onClick={() => update("category", c === "全部" ? "" : c)}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          aria-label="搜索商品"
          placeholder="搜索商品…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <select
          aria-label="商品排序"
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="default">精选排序</option>
          <option value="asc">价格从低到高</option>
          <option value="desc">价格从高到低</option>
        </select>
      </div>
      <p className={s.muted} role="status">
        {loading ? "正在加载商品…" : `${data?.total ?? 0} 件精选单品`}
      </p>
      {error && <ErrorState message={error.message} retry={refresh} />}
      {!loading && !error && (
        <>
          <div className={s.grid}>
            {list.map((p) => (
              <Link to={`/products/${p.id}`} className={s.card} key={p.id}>
                <div className={s.photo}>
                  <img
                    src={p.image}
                    alt={p.subtitle}
                    loading="lazy"
                    className="cover-image"
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
                  setDraft("");
                  setParams({});
                }}
              >
                重置筛选
              </button>
            </div>
          )}
          {data && data.total > 0 && (
            <nav className={s.pagination} aria-label="商品分页">
              <button
                className={s.outline}
                disabled={data.page <= 1}
                onClick={() =>
                  setParams((previous) => {
                    const next = new URLSearchParams(previous);
                    next.set("page", String(data.page - 1));
                    return next;
                  })
                }
              >
                上一页
              </button>
              <span>
                第 {data.page} / {data.totalPages} 页
              </span>
              <button
                className={s.outline}
                disabled={data.page >= data.totalPages}
                onClick={() =>
                  setParams((previous) => {
                    const next = new URLSearchParams(previous);
                    next.set("page", String(data.page + 1));
                    return next;
                  })
                }
              >
                下一页
              </button>
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}
