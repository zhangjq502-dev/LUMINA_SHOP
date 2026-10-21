# LUMINA

Next.js App Router + React + TypeScript + SCSS Modules 的商城学习项目。商品与订单已接入本地 PostgreSQL 和 Prisma 7。

## 当前能力

- 18 件数据库商品，按规格保存价格和库存；首页、商品列表、详情及购物车读取数据库商品。
- 服务端校验商品、规格、数量和地址，以数据库价格计算订单金额；金额以整数分保存。
- 事务内扣减库存、创建订单和商品快照；库存不足整单回滚。
- 以访客会话和提交编号实现幂等下单；相同编号但不同内容拒绝提交。
- HttpOnly Cookie 识别访客，数据库只保存 token 的 SHA-256 摘要。列表、详情和取消订单均验证归属。
- 取消待付款订单会在事务内归还库存，重复取消不会重复归还。
- 真实邮箱密码注册、登录、退出；scrypt 加盐哈希密码。登录后迁移当前访客未归属订单，订单按用户身份校验。
- 收货地址管理仍为界面演示；尚未接支付、发货、后台管理或订单过期任务。

## 本地启动

需要 Node.js 22.12+ 和 PostgreSQL。先创建一个独立的数据库，例如 `createdb lumina_shop`。

1. 复制 `.env.example` 为 `.env`，填写自己的 `DATABASE_URL`，不要提交 `.env`。
2. `npm install`（安装后自动生成 Prisma Client）。
3. `npm run db:deploy` 应用已提交的数据库迁移。
4. `npm run db:seed` 导入 18 件商品及初始 SKU 库存。
5. `npm run dev`，打开终端显示的本地地址。

种子数据位于 `src/data/products.ts`，只在导入脚本中使用。页面运行时的数据源是 PostgreSQL。重复导入更新商品资料及价格，不重置已有库存，也不删除订单。

修改模型后运行 `npm run db:migrate -- --name your_change`，然后 `npm run db:generate`。生成目录不进入 Git。

## 体验下单

打开 `/shop` → 商品详情选择规格并加入购物袋 → `/cart` → `/checkout`，填写虚构收货资料并提交。订单将真实保存在本地数据库，状态为「待付款」，不会扣款。

`/orders` 可以在刷新或重启应用后查看该浏览器 Cookie 对应的订单；详情页支持取消待付款订单。下单扣减 SKU 库存，取消后归还。尚无自动过期任务，请及时取消不需要的测试订单。

访客 Cookie 保存 30 天；注册或登录时会将当前访客尚未归属的订单关联到用户，并更换访客标识。退出后不能继续用访客标识查看该用户订单。购物车目前保存在页面内存，刷新会清空。

## 数据接口

| 接口                    | 说明                                    |
| ----------------------- | --------------------------------------- |
| `GET /api/products`     | 数据库商品列表，包含 SKU 价格和可用库存 |
| `GET /api/products/:id` | 商品详情                                |
| `POST /api/session`     | 建立访客 HttpOnly Cookie                |
| `GET /api/orders`       | 当前用户或访客的订单                    |
| `POST /api/orders`      | 校验、扣库存并创建待付款订单            |
| `GET /api/orders/:id`   | 当前用户或访客订单详情                  |
| `PATCH /api/orders/:id` | `{ "action": "cancel" }` 取消待付款订单 |

下单请求只接受 `idempotencyKey`（UUID）、`items`（商品 id、size、quantity）和 `shipping`（recipient、phone、email、province、district、address）。不接受客户端价格或状态。

## 检查

- `npm run lint`
- `npx tsc --noEmit`
- `npx next build --webpack`（当前受限环境下默认 Turbopack 的子进程端口绑定可能受限）
- 启动本地服务后运行 `npm run test:orders`。可通过 `TEST_BASE_URL` 指定地址。测试使用独立临时商品和虚构资料，覆盖价格校验、幂等、并发库存、权限隔离和取消归还库存，并自动清理自己的测试数据。

这是一套本地开发用后端。正式上线前还需接入邮箱验证、密码找回、支付回调、订单过期释放、全局限流及生产数据库配置。

## 登录身份验证

- 浏览器通过 `lumina_session` Cookie 保存随机生成的 32 字节会话 token。Cookie 为 HttpOnly、SameSite=Lax，生产环境额外使用 Secure；有效期 7 天。
- PostgreSQL `Session` 表只保存 token 的 SHA-256 哈希、用户 id、创建时间和过期时间，不保存原始 token。
- 服务端读取 Cookie，对 token 做哈希，再查会话是否存在、是否过期，最后获取用户。token 不返回给前端 JavaScript，也不放入页面数据。
- 密码以随机盐加 scrypt（N=32768、r=8、p=3）派生哈希存放在 `User.passwordHash`，校验时使用恒定时间比较。
- 每个邮箱注册/登录合计最多 20 次尝试 / 15 分钟，计数存数据库；写操作检查 Origin。
- 登录会换发 token 并撤销当前旧会话；退出删除服务端会话、清除 Cookie。其他设备的登录不受影响。
- `/account` 和 `/account/addresses` 要求登录。订单接口支持登录用户和未登录访客，所有查询与取消操作均校验归属。

| 接口                      | 说明                                    |
| ------------------------- | --------------------------------------- |
| `POST /api/auth/register` | `{ name, email, password }`，注册并登录 |
| `POST /api/auth/login`    | `{ email, password }`，登录             |
| `POST /api/auth/logout`   | 注销当前会话                            |
| `GET /api/auth/me`        | 返回安全的用户资料或 `user: null`       |

Navicat 可以查看 `User`、`Session`、`AuthThrottle` 表。`Order.userId` 表示订单关联用户。不要直接修改密码哈希、token 哈希或订单归属字段。

运行 `npm run test:auth` 验证注册、密码哈希、Cookie 属性、会话轮换与过期、退出、订单迁移及用户隔离。测试创建独立用户和商品，结束后清理数据。
