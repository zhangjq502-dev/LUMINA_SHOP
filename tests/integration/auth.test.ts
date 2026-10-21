import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { fixture, type Fixture } from "../helpers/fixture";
let f: Fixture;
beforeEach(async () => {
  f = await fixture();
});
afterEach(async () => {
  await f?.cleanup();
});
describe("注册与登录会话", () => {
  it("注册保存密码哈希，Cookie 为 HttpOnly，数据库只存 token 哈希", async () => {
    const { response, cookie, user } = await f.register();
    const header = response.headers
      .getSetCookie()
      .find((v) => v.startsWith("lumina_session="))!;
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Max-Age=604800/);
    const raw = cookie
      .split("; ")
      .find((v) => v.startsWith("lumina_session="))!
      .split("=")[1];
    expect(
      await f.db.session.findUnique({ where: { tokenHash: raw } }),
    ).toBeNull();
    expect(
      await f.db.session.findUnique({
        where: { tokenHash: createHash("sha256").update(raw).digest("hex") },
      }),
    ).not.toBeNull();
    const row = await f.db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).not.toBe(f.password);
    expect(row.passwordHash).toMatch(/^scrypt\$/);
    expect(user.passwordHash).toBeUndefined();
  });
  it("拒绝弱密码、重复邮箱、错误密码及不允许的请求来源", async () => {
    expect(
      (
        await f.request("/auth/register", {
          email: f.emails[0],
          name: "测试",
          password: "short",
        })
      ).status,
    ).toBe(400);
    await f.register();
    expect(
      (
        await f.request("/auth/register", {
          email: f.emails[0],
          name: "重复",
          password: f.password,
        })
      ).status,
    ).toBe(409);
    const wrong = await f.request("/auth/login", {
      email: f.emails[0],
      password: f.password + "wrong",
    });
    expect(wrong.status).toBe(401);
    expect(wrong.headers.get("set-cookie")).toBeNull();
    expect(
      (
        await f.request(
          "/auth/login",
          { email: f.emails[0], password: f.password },
          "",
          undefined,
          "https://other.example",
        )
      ).status,
    ).toBe(403);
  });
  it("重新登录会换发 token，退出后旧 token 立即失效", async () => {
    const a = await f.register();
    const login = await f.request(
      "/auth/login",
      { email: f.emails[0], password: f.password },
      a.cookie,
    );
    expect(login.status).toBe(200);
    const fresh = f.cookies(login);
    expect(fresh).not.toBe(a.cookie);
    expect(
      (await (await f.request("/auth/me", undefined, a.cookie)).json()).user,
    ).toBeNull();
    expect(
      (await (await f.request("/auth/me", undefined, fresh)).json()).user.email,
    ).toBe(f.emails[0]);
    expect((await f.request("/auth/logout", {}, fresh)).status).toBe(200);
    expect(
      (await (await f.request("/auth/me", undefined, fresh)).json()).user,
    ).toBeNull();
  });
  it("过期会话及伪造的 token 无法通过身份验证", async () => {
    const a = await f.register();
    await f.db.session.updateMany({
      where: { userId: a.user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(
      (await (await f.request("/auth/me", undefined, a.cookie)).json()).user,
    ).toBeNull();
    expect(
      (
        await (
          await f.request(
            "/auth/me",
            undefined,
            "lumina_session=" + "a".repeat(64),
          )
        ).json()
      ).user,
    ).toBeNull();
  });
  it("访客订单归入注册账户，旧访客及其他用户无权查看", async () => {
    const guest = await f.guest();
    const response = await f.request("/orders", f.orderInput(), guest);
    expect(response.status).toBe(201);
    const id = (await response.json()).order.id;
    const a = await f.register(0, guest);
    expect((await f.request(`/orders/${id}`, undefined, a.cookie)).status).toBe(
      200,
    );
    expect((await f.request(`/orders/${id}`, undefined, guest)).status).toBe(
      404,
    );
    const b = await f.register(1, guest);
    expect((await f.request(`/orders/${id}`, undefined, b.cookie)).status).toBe(
      404,
    );
    expect(
      (await (await f.request("/orders", undefined, b.cookie)).json()).orders,
    ).toHaveLength(0);
  });
  it("只向配置的前端开放带凭据 CORS", async () => {
    const response = await f.request("/auth/me");
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
  });
});
