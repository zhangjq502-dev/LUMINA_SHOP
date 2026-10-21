// @vitest-environment jsdom
import { afterEach, it, expect, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ShopPage from "../../src/pages/ShopPage/ShopPage";
import { getProductPage } from "../../src/services/products";
vi.mock("../../src/hooks/useResourceRefresh", () => ({
  useResourceRefresh: () => ({ version: 0, refresh: () => {} }),
}));
vi.mock("../../src/services/products", () => ({
  getProductPage: vi.fn(async (params: URLSearchParams) => ({
    products: [
      {
        id: "tee",
        name: "Tee",
        subtitle: "测试上衣",
        image: "/tee.jpg",
        category: "上衣",
        price: 100,
      },
    ],
    total: 18,
    page: Number(params.get("page") ?? 1),
    pageSize: 6,
    totalPages: 3,
    categories: ["上衣"],
  })),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("从 URL 恢复页码，并在更换分类后回到第一页", async () => {
  render(
    <MemoryRouter initialEntries={["/shop?page=2&sort=asc"]}>
      <ShopPage />
    </MemoryRouter>,
  );
  expect(await screen.findByText("第 2 / 3 页")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "下一页" }));
  expect(await screen.findByText("第 3 / 3 页")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "下一页" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "上衣" }));
  expect(await screen.findByText("第 1 / 3 页")).toBeTruthy();
  const last = vi.mocked(getProductPage).mock.calls.at(-1)![0];
  expect(last.get("category")).toBe("上衣");
  expect(last.get("sort")).toBe("asc");
  expect(last.has("page")).toBe(false);
});
it("输入搜索词时防抖，最终请求保留关键词并清除旧页码", async () => {
  render(
    <MemoryRouter initialEntries={["/shop?page=2"]}>
      <ShopPage />
    </MemoryRouter>,
  );
  await screen.findByText("第 2 / 3 页");
  const before = vi.mocked(getProductPage).mock.calls.length;
  fireEvent.change(screen.getByRole("textbox", { name: "搜索商品" }), {
    target: { value: "knit" },
  });
  expect(vi.mocked(getProductPage).mock.calls.length).toBe(before);
  await waitFor(() =>
    expect(vi.mocked(getProductPage).mock.calls.at(-1)![0].get("q")).toBe(
      "knit",
    ),
  );
  expect(vi.mocked(getProductPage).mock.calls.at(-1)![0].has("page")).toBe(
    false,
  );
});
