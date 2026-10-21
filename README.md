# LUMINA SHOP

极简服饰商城。前端已整体迁移为 **React + Vite + TypeScript + React Router**，后端为独立 **NestJS + Prisma + PostgreSQL** 服务。

## 启动

建议 Node.js 22.12+。在项目根目录：

```sh
npm install
cp .env.example .env
# 在本地 .env 填写 DATABASE_URL
npm run db:generate
npm run db:deploy
npm run db:seed
```

已配置数据库的项目不需要重复复制 .env 或导入种子。分别打开两个终端：

```sh
npm run dev:api
```

```sh
npm run dev
```

前端：http://localhost:5173；API：http://localhost:4000/api。旧 Next.js 的 3000 端口不再用于本项目。请通过 localhost 访问，使浏览器来源与 FRONTEND_ORIGIN 一致。

## 看代码的顺序

1. `src/main.tsx`：React 挂载入口和全局错误处理。
2. `src/router/routes.tsx`：页面路由表和懒加载；`src/App.tsx`：整体布局与路由渲染。
3. `src/pages`：页面获取数据，处理加载、失败、重试。
4. `src/components`：展示和表单组件，SCSS Modules 样式。
5. `src/services/http.ts`：统一 fetch 请求、携带 Cookie、处理错误；其他 services 文件按业务调用接口。
6. `src/providers/AuthProvider.tsx`：当前用户；`CartProductsProvider.tsx`：购物车商品按需查询；`src/stores/cart.ts`：Zustand 购物车持久化。
7. `backend/src`：Controller 接收请求，Service 实现业务，通过 Prisma 访问数据库。

数据流：浏览器 React → HTTP API → NestJS → Prisma → PostgreSQL → JSON → React 渲染。前端没有数据库连接，也没有 Next.js 服务端组件。

## 已实现功能

- 首页、商品列表、分类搜索与排序、商品详情与 SKU 库存选择；商品图片使用浏览器原生懒加载，首屏主图优先加载。
- 购物车数量、金额、持久化与登录后合并访客购物车。
- 注册、登录、退出、账户资料、修改密码、找回密码、邮箱验证。
- 地址增删改查和默认地址。
- 访客/用户结算、订单列表与详情、取消、确认收货。
- 服务端校验价格和库存，事务预留库存、超时释放、请求幂等。
- 本地模拟付款；Stripe 测试支付接口和签名回调代码已保留，需配置服务后再联调。
- 管理员商品、库存维护及发货。
- 页面加载状态、失败重试、路由权限、404、移动端样式。

登录使用 HttpOnly Cookie `lumina_session`；数据库保存会话摘要。浏览器自动携带凭据，JavaScript 不读取登录 token，也不把它放进 localStorage。购物车保存于 localStorage。

## 环境变量

以 `.env.example` 为准。`VITE_API_URL` 是公开的浏览器 API 地址；`FRONTEND_ORIGIN` 是后端允许的前端来源。数据库、邮件和支付密钥只供后端使用，不能加 `VITE_` 前缀。修改 .env 后重启服务。

本地 `PAYMENT_MODE=demo` 模拟支付不会扣款；生产环境禁止 demo。未配置 SMTP 时，开发邮件写入 `backend/.mail-outbox/`，打开其中邮件查看验证/重置链接。不要提交或分享这些文件。真实 SMTP、Stripe 沙箱和正式部署尚需服务配置与联调。

授予已有账户管理员角色：

```sh
npm run admin:grant -- your-email@example.com
```

## 检查与数据库

```sh
npm run lint
npm run build
npm run build:api
npm test
npm run db:studio
```

测试创建独立 `lumina_shop_test` 数据库，需要本地数据库用户有建库权限；可设置独立 `TEST_DATABASE_URL`。不会对业务库运行测试清理。集成测试覆盖认证、地址、订单、库存与模拟支付。

## 部署

`npm run build` 输出前端 `dist/` 静态资源；NestJS 单独构建、部署。静态服务器必须把页面路由回退到 index.html，参考根目录 `nginx.conf`，否则刷新 `/orders` 会返回服务器 404。生产环境配置 HTTPS、API 地址、Cookie 和精确 CORS 来源。

React SPA 在浏览器获取数据，当前保留基础页面标题和描述；没有 Next.js SSR。若未来需要商品搜索引擎收录优化，可单独评估预渲染。`npm run preview` 用于本地预览构建结果。

## 路由懒加载与商品分页

页面使用 React.lazy 和 Suspense，访问时再下载对应页面代码。商品列表通过 `/api/products/paginated?page=1&pageSize=6&q=&category=&sort=default` 获取数据，每页默认 6 件、最多 24 件。后端在查询数据库时完成筛选、排序、计数和分页；相同价格使用 id 保证顺序稳定，越界页自动返回最后一页。

页码、分类和排序保存在 URL，搜索输入防抖 350ms，切换筛选会清除旧页码。购物车已改为按商品 ID 批量查询，首页、列表、详情和购物车分别获取所需数据。

## 前端组件目录约定

- 每个页面放在 `src/pages/页面名/页面名.tsx`，完整商品列表和购物车分别为 ShopPage、CartPage。
- 每个功能组件放在 `src/components/业务域/组件名/组件名.tsx`。
- 有专属样式时，旁边放置同名 `.module.scss`；只使用公共样式、仅控制逻辑的组件不创建空样式文件。
- `src/styles/common.module.scss` 只保留跨组件复用的按钮、表单、排版和布局；`_tokens.scss` 保存颜色变量。
- `mergeStyles` 将公共类名与本地类名组合，确保嵌套规则和响应式样式都能匹配；组件模块在导入时组合一次。
- 新增或移动页面后更新 `src/router/routes.tsx`。不再使用旧的 `commerce.module.scss`。

## 身份、页面请求与购物车按需查询

`AuthProvider` 只管理当前用户和身份刷新。页面使用 `useResourceRefresh` 分别订阅 products、orders、addresses、admin，订单刷新不会重新加载身份或商品目录。

首页请求 6 件精选商品；商品详情按主键查询；购物车和结算由 `CartProductsProvider` 根据当前条目的去重 ID 调用 `/api/products/batch?ids=[...]`，空购物车不发商品请求。批量查询最多接受 100 个 ID，排除下架商品；查询失败展示重试，不删除本地条目。`GET /api/products` 也改为有界分页，防止误调用导致全量返回。

## 浏览器端到端测试

```sh
npx playwright install chromium
npm run test:e2e
npm run test:e2e:report
```

本地默认使用已安装的 Google Chrome；CI 使用安装的 Chromium。测试自动启动独立 API 和 5188 端口前端，连接独立 *_test 数据库；创建临时商品与管理员，执行注册、加购、刷新恢复、按 ID 查询、下单、模拟付款、后台发货和确认收货，并在结束后清理自己的数据。不会更改业务数据库或向 Stripe 发起支付。运行前不要占用 5188 端口。失败报告保存在 playwright-report 和 test-results，不提交到仓库。

## 配置 Stripe 沙箱（可稍后完成）

目前本地使用 demo 模拟支付。Stripe 适配器、Checkout 会话复用/幂等、服务端价格和运费、支付回跳同步、签名回调及重复事件处理已有实现；自动化使用替身验证 Stripe SDK 请求与签名，不能代替真实 Stripe 沙箱联调。

1. 在 Stripe 控制台选择测试模式或 Sandbox，进入 API keys，取得 Secret key（sk_test_ 开头）。仅填写本地 `.env` 的 STRIPE_SECRET_KEY，不使用 live key。
2. 安装官方 Stripe CLI 并执行 `stripe login`。
3. 保持 `stripe listen --forward-to localhost:4000/api/payments/webhook` 运行，将它显示的 whsec_ 密钥填到本地 `.env` 的 STRIPE_WEBHOOK_SECRET。CLI 密钥与控制台配置端点的密钥不能混用。
4. 重启后端，打开待付款订单，点击 Stripe 测试支付。支付状态以后端验签回调或主动查询结果为准，不能靠回跳地址判断。
5. 验证成功支付、取消返回、重复回调与刷新后的状态；没有外部密钥时继续使用 PAYMENT_MODE=demo。只有 sk_test_ 和回调密钥都已填写才启用 Stripe，否则开发模式回退 demo，生产模式禁用付款。

官方说明：https://docs.stripe.com/keys 、https://docs.stripe.com/stripe-cli 、https://docs.stripe.com/checkout/fulfillment
