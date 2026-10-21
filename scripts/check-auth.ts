import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const suffix = randomUUID();
const emails = [`auth-a-${suffix}@example.com`, `auth-b-${suffix}@example.com`];
const productId = `auth-product-${suffix}`;
const password = `Test-${randomUUID()}!`;
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
function token(cookie: string) {
  return cookie
    .split("; ")
    .find((c) => c.startsWith("lumina_session="))!
    .split("=")[1];
}
async function request(
  path: string,
  body?: unknown,
  cookie = "",
  origin = base,
) {
  return fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
}
async function me(cookie: string) {
  return (await (await request("/api/auth/me", undefined, cookie)).json()).user;
}
async function main() {
  await db.product.create({
    data: {
      id: productId,
      name: "Auth test",
      subtitle: "测试商品",
      category: "测试",
      priceCents: 100,
      image: "/images/tee.jpg",
      color: "白",
      description: "Test fixture",
      colors: [],
      skus: { create: { size: "M", stock: 5, priceCents: 100 } },
    },
  });
  const guestResponse = await request("/api/session", {});
  const guest = cookies(guestResponse);
  const orderResponse = await request(
    "/api/orders",
    {
      idempotencyKey: randomUUID(),
      items: [{ id: productId, size: "M", quantity: 1 }],
      shipping: {
        recipient: "认证测试",
        phone: "13800000000",
        email: emails[0],
        province: "测试省",
        district: "测试区",
        address: "测试路一号",
      },
    },
    guest,
  );
  assert.equal(orderResponse.status, 201);
  const orderId = (await orderResponse.json()).order.id;
  assert.equal(
    (
      await request("/api/auth/register", {
        email: emails[0],
        name: "test",
        password: "short",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/auth/register",
        { email: emails[0], name: "test", password },
        "",
        "https://other.example",
      )
    ).status,
    403,
  );
  const registration = await request(
    "/api/auth/register",
    { email: emails[0].toUpperCase(), name: "账户甲", password },
    guest,
  );
  assert.equal(registration.status, 200, await registration.clone().text());
  const authA = cookies(registration);
  const responseText = await registration.text();
  assert(!responseText.includes("tokenHash"));
  assert(!responseText.includes(password));
  const sessionHeader = registration.headers
    .getSetCookie()
    .find((c) => c.startsWith("lumina_session="))!;
  assert.match(sessionHeader, /HttpOnly/i);
  assert.match(sessionHeader, /SameSite=lax/i);
  assert.match(sessionHeader, /Max-Age=604800/);
  const userA = await me(authA);
  assert.equal(userA.email, emails[0]);
  const record = await db.user.findUniqueOrThrow({
    where: { email: emails[0] },
  });
  assert.notEqual(record.passwordHash, password);
  assert.match(record.passwordHash, /^scrypt\$/);
  const rawToken = token(authA);
  const hash = createHash("sha256").update(rawToken).digest("hex");
  assert(await db.session.findUnique({ where: { tokenHash: hash } }));
  assert.equal(
    await db.session.findUnique({ where: { tokenHash: rawToken } }),
    null,
  );
  assert.equal(
    (await db.order.findUniqueOrThrow({ where: { id: orderId } })).userId,
    userA.id,
    "guest order must transfer",
  );
  assert.equal(
    (await request(`/api/orders/${orderId}`, undefined, guest)).status,
    404,
    "old guest token cannot access claimed order",
  );
  assert.equal(
    (
      await request("/api/auth/register", {
        email: emails[0],
        name: "duplicate",
        password,
      })
    ).status,
    409,
  );
  const wrong = await request("/api/auth/login", {
    email: emails[0],
    password: password + "wrong",
  });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.headers.get("set-cookie"), null);
  const b = await request(
    "/api/auth/register",
    { email: emails[1], name: "账户乙", password },
    guest,
  );
  assert.equal(b.status, 200);
  const authB = cookies(b);
  assert.equal(
    (await request(`/api/orders/${orderId}`, undefined, authB)).status,
    404,
    "other account cannot access order",
  );
  const anonymous = (
    await (await request("/api/orders", undefined, guest)).json()
  ).orders;
  assert(!anonymous.some((o: { id: string }) => o.id === orderId));
  const login = await request(
    "/api/auth/login",
    { email: emails[0], password },
    authA,
  );
  assert.equal(login.status, 200);
  const refreshed = cookies(login);
  assert.notEqual(token(refreshed), rawToken);
  assert.equal(await me(authA), null, "old session revoked on new login");
  assert.equal(
    (await request(`/api/orders/${orderId}`, undefined, refreshed)).status,
    200,
    "account keeps order after login",
  );
  const out = await request("/api/auth/logout", {}, refreshed);
  assert.equal(out.status, 200);
  assert.equal(await me(refreshed), null, "logout revokes stored session");
  assert.equal(
    (await request(`/api/orders/${orderId}`, undefined, cookies(out))).status,
    404,
  );
  const loggedIn = await request("/api/auth/login", {
    email: emails[0],
    password,
  });
  assert.equal(loggedIn.status, 200);
  const expired = cookies(loggedIn);
  await db.session.update({
    where: {
      tokenHash: createHash("sha256").update(token(expired)).digest("hex"),
    },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(await me(expired), null, "expired token rejected");
  const account = await request("/account");
  assert([307, 308].includes(account.status), "account page requires login");
  console.log(
    "PASS: registration, password hashing, HttpOnly cookie, token hash, login, rotation, expiry, logout, guest order transfer, cross-user isolation",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const rows = await db.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
    });
    await db.order.deleteMany({
      where: { id: { in: rows.map((r) => r.orderId) } },
    });
    await db.product.deleteMany({ where: { id: productId } });
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.authThrottle.deleteMany({
      where: {
        key: {
          in: emails.map((email) =>
            createHash("sha256").update(email).digest("hex"),
          ),
        },
      },
    });
    await db.$disconnect();
  });
