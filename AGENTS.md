# LUMINA 开发约定

本项目已从 Next.js 迁移到 React + Vite，后端为独立 NestJS 服务。

- 前端入口：src/main.tsx；路由表：src/router/routes.tsx；页面：src/pages。
- 浏览器通过 src/services 请求后端，页面不直接访问 Prisma。
- 使用 TypeScript、SCSS Modules 和 Zustand；不使用 Tailwind。
- 登录凭据保存在 HttpOnly Cookie，不能移入 localStorage。
- 后端业务和 Prisma 位于 backend；保留订单事务、库存校验和权限控制。
- 修改后执行 npm run lint、npm run build、npm run build:api、npm test。
- 不提交 .env、生成客户端、数据库备份和本地邮件。

- 页面与组件按同名文件夹组织；专属 SCSS Module 与 TSX 同目录。公共样式保留在 styles/common.module.scss，不复制到每个组件。
