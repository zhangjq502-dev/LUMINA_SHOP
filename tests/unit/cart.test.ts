import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanCart, mergeCart, createCartStore } from "../../src/stores/cart";
afterEach(() => vi.unstubAllGlobals());
describe("购物车持久化", () => {
  it("丢弃损坏的数量和商品记录", () => {
    expect(cleanCart(null)).toEqual([]);
    expect(
      cleanCart([
        { id: "a", size: "M", quantity: -1 },
        { id: "a", size: "M", quantity: 2 },
      ]),
    ).toEqual([{ id: "a", size: "M", quantity: 2 }]);
  });
  it("登录合并相同规格，数量上限为十件", () => {
    expect(
      mergeCart(
        [{ id: "a", size: "M", quantity: 8 }],
        [
          { id: "a", size: "M", quantity: 5 },
          { id: "a", size: "L", quantity: 1 },
        ],
      ),
    ).toEqual([
      { id: "a", size: "M", quantity: 10 },
      { id: "a", size: "L", quantity: 1 },
    ]);
  });
  it("重建 store 后恢复数据，其他账户互相隔离", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    const first = createCartStore("user-a");
    await first.persist.rehydrate();
    first.getState().setItems([{ id: "a", size: "M", quantity: 2 }]);
    const second = createCartStore("user-a");
    await second.persist.rehydrate();
    expect(second.getState().items).toHaveLength(1);
    const other = createCartStore("user-b");
    await other.persist.rehydrate();
    expect(other.getState().items).toEqual([]);
  });
});
