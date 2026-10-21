import "reflect-metadata";
import { port, frontendOrigin } from "./config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import type { Request, Response, NextFunction } from "express";
import { AppModule } from "./app.module";
import { ApiErrorFilter } from "./common/api-error.filter";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.enableCors({ origin: frontendOrigin, credentials: true });
  // Cookie 身份验证的写请求只接受配置的前端 Origin；非浏览器客户端可无 Origin。
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "private, no-store");
    const origin = req.headers.origin;
    if (
      ["/api/payments/webhook", "/api/payments/alipay/notify"].includes(
        req.path,
      )
    )
      return next();
    if (
      ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) &&
      ((origin && origin !== frontendOrigin) ||
        (!origin && req.headers["sec-fetch-site"] === "cross-site"))
    )
      return res.status(403).json({ error: "请求来源无效" });
    next();
  });
  app.useGlobalFilters(new ApiErrorFilter());
  app.enableShutdownHooks();
  await app.listen(port, process.env.HOST ?? "127.0.0.1");
}
void bootstrap();
