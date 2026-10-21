// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useRequest } from "../../src/hooks/useRequest";
import AuthProvider from "../../src/providers/AuthProvider";
import { ProtectedRoute } from "../../src/router/ProtectedRoute";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function RequestPage({
  loader,
  version = 0,
}: {
  loader: (signal: AbortSignal) => Promise<string>;
  version?: number;
}) {
  const { data, loading, error } = useRequest(loader, version);
  return <div>{loading ? "加载中" : error ? error.message : data}</div>;
}
describe("React 页面请求", () => {
  it("请求失败后可重新加载", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("网络不可用"))
      .mockResolvedValueOnce("成功");
    const view = render(<RequestPage loader={loader} />);
    expect(await screen.findByText("网络不可用")).toBeTruthy();
    view.rerender(<RequestPage loader={loader} version={1} />);
    expect(await screen.findByText("成功")).toBeTruthy();
  });
  it("离开页面时取消请求，避免旧结果覆盖新页面", async () => {
    let signal: AbortSignal | undefined;
    const loader = vi.fn((incoming: AbortSignal) => {
      signal = incoming;
      return new Promise<string>(() => {});
    });
    const view = render(<RequestPage loader={loader} />);
    await waitFor(() => expect(loader).toHaveBeenCalledOnce());
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
function protectedApp(user: unknown, admin = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: string) =>
        new Response(
          JSON.stringify(
            input.endsWith("/products") ? { products: [] } : { user },
          ),
          { status: 200 },
        ),
    ),
  );
  return render(
    <MemoryRouter initialEntries={["/private"]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute admin={admin} />}>
            <Route path="/private" element={<h1>私人页面</h1>} />
          </Route>
          <Route path="/login" element={<h1>请登录</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}
describe("React Router 身份校验", () => {
  it("访客访问受保护地址会跳转登录", async () => {
    protectedApp(null);
    expect(await screen.findByText("请登录")).toBeTruthy();
  });
  it("普通用户无法打开管理页面", async () => {
    protectedApp({ id: "user", role: "USER" }, true);
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "你没有访问管理页面的权限。",
    );
  });
  it("管理员可打开管理页面", async () => {
    protectedApp({ id: "admin", role: "ADMIN" }, true);
    expect(await screen.findByText("私人页面")).toBeTruthy();
  });
  it("初始接口失败后可点击重试", async () => {
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (fail) throw new Error("offline");
        return new Response(
          JSON.stringify(
            input.endsWith("/products") ? { products: [] } : { user: null },
          ),
        );
      }),
    );
    render(
      <AuthProvider>
        <h1>商城就绪</h1>
      </AuthProvider>,
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(await screen.findByText("商城就绪")).toBeTruthy();
  });
});

it("身份提供者只读取用户，不请求商品；订单刷新不会重新请求身份", async () => {
  const fetcher = vi.fn(
    async () => new Response(JSON.stringify({ user: null })),
  );
  vi.stubGlobal("fetch", fetcher);
  const { useResourceRefresh } =
    await import("../../src/hooks/useResourceRefresh");
  function Orders() {
    const { refresh } = useResourceRefresh("orders");
    return <button onClick={refresh}>刷新订单</button>;
  }
  render(
    <AuthProvider>
      <Orders />
    </AuthProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "刷新订单" }));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toContain("/auth/me");
});
