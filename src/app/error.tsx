"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main style={{ maxWidth: 700, margin: "80px auto", padding: 24 }}>
      <h1>页面暂时无法加载</h1>
      <p>请确认 PostgreSQL 已启动，并完成数据库迁移和商品导入后重试。</p>
      <button onClick={reset}>重新加载</button>
    </main>
  );
}
