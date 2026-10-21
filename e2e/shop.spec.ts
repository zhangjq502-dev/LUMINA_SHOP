import { test, expect } from "@playwright/test";
const product = () => process.env.E2E_PRODUCT!;
const password = () => process.env.E2E_PASSWORD!;
test("注册、加购持久化、按需商品查询、下单、付款、管理员发货、收货完整流程", async ({
  page,
  browser,
}) => {
  const productRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/products"))
      productRequests.push(request.url());
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "注册", exact: true }).click();
  await page.getByLabel("昵称").fill("端到端用户");
  await page.getByLabel("邮箱", { exact: true }).fill(process.env.E2E_EMAIL!);
  await page.getByLabel("密码", { exact: true }).fill(password());
  await page.getByLabel("确认密码", { exact: true }).fill(password());
  await page.getByRole("button", { name: "创建账户 ↗" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByRole("heading", { name: "我的账户", exact: true }),
  ).toBeVisible();
  expect(productRequests).toEqual([]);
  await page.goto(`/products/${product()}`);
  await page.getByRole("button", { name: "加入购物袋 ↗" }).click();
  await page.getByRole("link", { name: "查看购物袋 →" }).click();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "E2E Test Tee", exact: true }),
  ).toBeVisible();
  expect(productRequests.some((url) => url.includes("/batch?"))).toBe(true);
  expect(
    productRequests.some((url) => new URL(url).pathname === "/api/products"),
  ).toBe(false);
  const batch = productRequests
    .filter((url) => url.includes("/batch?"))
    .at(-1)!;
  expect(JSON.parse(new URL(batch).searchParams.get("ids")!)).toEqual([
    product(),
  ]);
  await page.getByRole("link", { name: "前往结算 ↗" }).click();
  await page.getByLabel("收件人", { exact: true }).fill("端到端收件人");
  await page.getByLabel("联系电话").fill("13800000000");
  await page.getByLabel("邮箱", { exact: true }).fill(process.env.E2E_EMAIL!);
  await page.getByLabel("省 / 市").selectOption("上海市");
  await page.getByLabel("区 / 县").fill("测试区");
  await page.getByLabel("详细地址").fill("自动化演示地址 1 号");
  await page.getByRole("button", { name: "提交订单 ↗" }).click();
  await expect(page).toHaveURL(/\/orders\/[^/]+$/);
  const orderUrl = page.url();
  await page.getByRole("button", { name: "模拟付款", exact: true }).click();
  await expect(page.getByText("待发货", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("待发货", { exact: true })).toBeVisible();
  const admin = await browser.newContext({ baseURL: "http://localhost:5188" });
  try {
    const adminPage = await admin.newPage();
    await adminPage.goto("/login");
    await adminPage
      .getByLabel("邮箱", { exact: true })
      .fill(process.env.E2E_ADMIN_EMAIL!);
    await adminPage.getByLabel("密码", { exact: true }).fill(password());
    await adminPage.getByRole("button", { name: "登录 ↗" }).click();
    await expect(adminPage).toHaveURL(/\/account$/);
    await adminPage.goto("/admin");
    const order = adminPage
      .locator("article")
      .filter({ hasText: "端到端收件人" });
    await order.getByLabel("承运商").fill("测试快递");
    await order.getByLabel("物流单号").fill("E2E123456");
    await order.getByRole("button", { name: "确认发货" }).click();
    await expect(order.getByText(/运输中/)).toBeVisible();
  } finally {
    await admin.close();
  }
  await page.goto(orderUrl);
  await page.getByRole("button", { name: "确认收货", exact: true }).click();
  await expect(page.getByText("已完成", { exact: true }).first()).toBeVisible();
  const stranger = await browser.newContext();
  try {
    expect(
      (
        await stranger.request.get(
          `${process.env.E2E_API}/orders/${new URL(orderUrl).pathname.split("/").at(-1)}`,
        )
      ).status(),
    ).toBe(404);
  } finally {
    await stranger.close();
  }
});
test("商品分页、刷新恢复页码与访客权限保护", async ({ page }) => {
  await page.goto(
    `/shop?page=2&pageSize=1&category=${encodeURIComponent(product())}`,
  );
  await expect(
    page.getByRole("navigation", { name: "商品分页" }),
  ).toBeVisible();
  await expect(page.getByText("第 2 / 2 页")).toBeVisible();
  await page.reload();
  await expect(page.getByText("第 2 / 2 页")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "精选商品", exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});
