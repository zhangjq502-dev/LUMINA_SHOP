import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { fixture, type Fixture } from "../helpers/fixture";
let f: Fixture;
beforeEach(async () => {
  f = await fixture();
});
afterEach(async () => {
  await f?.cleanup();
});
describe("商品分页接口", () => {
  it("筛选后再分页，价格相同使用稳定顺序，不重复或漏掉商品", async () => {
    const category = f.productId;
    await f.db.product.update({
      where: { id: f.productId },
      data: { category, priceCents: 100 },
    });
    for (const [index, priceCents] of [100, 300, 200].entries()) {
      const id = `${f.productId}-${index}`;
      f.extraProductIds.push(id);
      await f.db.product.create({
        data: {
          id,
          category,
          priceCents,
          name: "分页商品",
          subtitle: "测试",
          description: "test",
          image: "/images/tee.jpg",
          color: "白",
          colors: [],
        },
      });
    }
    const fetchPage = async (page: number) =>
      (
        await f.request(
          `/products/paginated?category=${category}&sort=asc&pageSize=2&page=${page}`,
        )
      ).json();
    const first = await fetchPage(1),
      second = await fetchPage(2);
    expect(first.total).toBe(4);
    expect(first.totalPages).toBe(2);
    expect(first.products).toHaveLength(2);
    expect(second.products).toHaveLength(2);
    const products = [...first.products, ...second.products];
    expect(new Set(products.map((p) => p.id)).size).toBe(4);
    expect(products.map((p) => p.price)).toEqual([1, 1, 2, 3]);
  });
  it("关键词搜索不区分大小写，隐藏下架商品并处理空结果和越界页", async () => {
    const result = await (
      await f.request(`/products/paginated?q=TEST%20PRODUCT&page=99999`)
    ).json();
    expect(
      result.products.some((p: { id: string }) => p.id === f.productId),
    ).toBe(true);
    expect(result.page).toBe(result.totalPages);
    await f.db.product.update({
      where: { id: f.productId },
      data: { active: false },
    });
    const empty = await (
      await f.request(`/products/paginated?q=${f.productId}`)
    ).json();
    expect(empty.total).toBe(0);
    expect(empty.page).toBe(1);
    expect(empty.products).toEqual([]);
    const inactive = await (
      await f.request("/products/paginated?q=TEST%20PRODUCT")
    ).json();
    expect(
      inactive.products.some((p: { id: string }) => p.id === f.productId),
    ).toBe(false);
  });
  it("拒绝非法页码、超大页尺寸、重复参数和未知排序", async () => {
    for (const query of [
      "page=0",
      "page=-1",
      "page=1.2",
      "page=1&page=2",
      "pageSize=10000",
      "sort=unsafe",
      "q[x]=x",
    ]) {
      expect(
        (await f.request(`/products/paginated?${query}`)).status,
        query,
      ).toBe(400);
    }
  });
});

it("购物车按 ID 批量查询，去重并排除下架商品，拒绝非法参数", async () => {
  const url = `/products/batch?ids=${encodeURIComponent(JSON.stringify([f.productId, f.productId, "missing"]))}`;
  const data = await (await f.request(url)).json();
  expect(data.products.map((p: { id: string }) => p.id)).toEqual([f.productId]);
  await f.db.product.update({
    where: { id: f.productId },
    data: { active: false },
  });
  expect((await (await f.request(url)).json()).products).toEqual([]);
  for (const ids of [
    "bad",
    "{}",
    JSON.stringify([12]),
    JSON.stringify(Array(101).fill("id")),
  ])
    expect(
      (await f.request(`/products/batch?ids=${encodeURIComponent(ids)}`))
        .status,
    ).toBe(400);
});
