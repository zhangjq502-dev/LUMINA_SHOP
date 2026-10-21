"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main style={{ padding: 40, fontFamily: "Arial" }}>
          <h1>LUMINA 暂时无法连接数据库</h1>
          <p>请确认 PostgreSQL 已启动，且 DATABASE_URL 配置正确。</p>
          <button onClick={reset}>重试</button>
        </main>
      </body>
    </html>
  );
}
