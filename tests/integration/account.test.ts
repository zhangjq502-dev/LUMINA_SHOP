import { beforeEach, afterEach, describe, it, expect, inject } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fixture, type Fixture } from "../helpers/fixture";
let f: Fixture;
beforeEach(async () => {
  f = await fixture();
});
afterEach(async () => {
  await f?.cleanup();
});
const address = {
  recipient: "测试收件人",
  phone: "13800000000",
  province: "上海市",
  district: "测试区",
  address: "测试路100号",
  isDefault: true,
};
async function mailToken(email: string, subject: string) {
  const directory = inject("mailOutbox");
  for (const name of await readdir(directory)) {
    const mail = JSON.parse(await readFile(join(directory, name), "utf8"));
    if (mail.to === email && mail.subject.includes(subject)) {
      const token = mail.text.match(/token=([a-f0-9]{64})/)?.[1];
      if (token) return token;
    }
  }
  throw new Error("未找到测试邮件");
}
describe("账户和地址", () => {
  it("地址要求登录，跨用户修改和删除会被拒绝", async () => {
    expect((await f.request("/account/addresses")).status).toBe(401);
    const a = await f.register(),
      b = await f.register(1);
    const response = await f.request("/account/addresses", address, a.cookie);
    expect(response.status).toBe(201);
    const id = (await response.json()).address.id;
    expect(
      (await f.request(`/account/addresses/${id}`, address, b.cookie, "PATCH"))
        .status,
    ).toBe(404);
    expect(
      (await f.request(`/account/addresses/${id}`, {}, b.cookie, "DELETE"))
        .status,
    ).toBe(404);
    expect(
      (
        await (
          await f.request("/account/addresses", undefined, b.cookie)
        ).json()
      ).addresses,
    ).toHaveLength(0);
  });
  it("并发添加默认地址时只保留一个默认，删除后自动选择下一个", async () => {
    const a = await f.register();
    await Promise.all([
      f.request("/account/addresses", address, a.cookie),
      f.request(
        "/account/addresses",
        { ...address, recipient: "另一个" },
        a.cookie,
      ),
    ]);
    let list = (
      await (await f.request("/account/addresses", undefined, a.cookie)).json()
    ).addresses;
    expect(list).toHaveLength(2);
    expect(
      list.filter((v: { isDefault: boolean }) => v.isDefault),
    ).toHaveLength(1);
    await f.request(
      `/account/addresses/${list.find((v: { isDefault: boolean }) => v.isDefault).id}`,
      {},
      a.cookie,
      "DELETE",
    );
    list = (
      await (await f.request("/account/addresses", undefined, a.cookie)).json()
    ).addresses;
    expect(list).toHaveLength(1);
    expect(list[0].isDefault).toBe(true);
  });
  it("资料只能修改白名单字段，修改密码会撤销所有会话", async () => {
    const a = await f.register();
    expect(
      (
        await f.request(
          "/account/profile",
          { name: "新昵称", role: "ADMIN" },
          a.cookie,
          "PATCH",
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await f.request(
          "/account/profile",
          { name: "新昵称" },
          a.cookie,
          "PATCH",
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await f.request(
          "/account/password",
          { currentPassword: "wrong-pass", newPassword: "New-password-123" },
          a.cookie,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await f.request(
          "/account/password",
          { currentPassword: f.password, newPassword: "New-password-123" },
          a.cookie,
        )
      ).ok,
    ).toBe(true);
    expect(
      (await (await f.request("/auth/me", undefined, a.cookie)).json()).user,
    ).toBeNull();
    expect(
      (
        await f.request("/auth/login", {
          email: f.emails[0],
          password: "New-password-123",
        })
      ).status,
    ).toBe(200);
  });
});
describe("邮箱验证和密码找回", () => {
  it("验证链接成功后不能重复使用", async () => {
    const a = await f.register();
    expect((await f.request("/auth/verification-email", {}, a.cookie)).ok).toBe(
      true,
    );
    const token = await mailToken(f.emails[0], "验证");
    expect((await f.request("/auth/verify-email", { token })).ok).toBe(true);
    expect((await f.request("/auth/verify-email", { token })).status).toBe(400);
    expect(
      (await f.db.user.findUniqueOrThrow({ where: { id: a.user.id } }))
        .emailVerifiedAt,
    ).not.toBeNull();
  });
  it("找回密码不在接口中暴露 token，重置后旧会话和旧链接失效", async () => {
    const a = await f.register();
    const response = await f.request("/auth/forgot-password", {
      email: f.emails[0],
    });
    expect(await response.json()).toEqual({ ok: true });
    const token = await mailToken(f.emails[0], "重置");
    expect(
      (
        await f.request("/auth/reset-password", {
          token,
          password: "Reset-new-pass-123",
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await f.request("/auth/reset-password", {
          token,
          password: "Reset-next-pass-123",
        })
      ).status,
    ).toBe(400);
    expect(
      (await (await f.request("/auth/me", undefined, a.cookie)).json()).user,
    ).toBeNull();
    expect(
      (
        await f.request("/auth/login", {
          email: f.emails[0],
          password: "Reset-new-pass-123",
        })
      ).status,
    ).toBe(200);
  });
  it("过期重置链接被拒绝，未注册邮箱得到相同的受理响应", async () => {
    const a = await f.register();
    await f.request("/auth/forgot-password", { email: f.emails[0] });
    const token = await mailToken(f.emails[0], "重置");
    await f.db.emailToken.updateMany({
      where: { userId: a.user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(
      (
        await f.request("/auth/reset-password", {
          token,
          password: "Reset-new-pass-123",
        })
      ).status,
    ).toBe(400);
    expect(
      await (
        await f.request("/auth/forgot-password", { email: f.emails[1] })
      ).json(),
    ).toEqual({ ok: true });
  });
});
