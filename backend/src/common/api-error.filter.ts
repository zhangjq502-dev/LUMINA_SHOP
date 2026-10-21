import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger("API");
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    if (status >= 500)
      this.logger.error(
        error instanceof Error ? error.message : "Unexpected error",
      );
    response
      .status(status)
      .json({
        error:
          error instanceof HttpException
            ? error.message
            : "服务暂时不可用，请稍后重试",
      });
  }
}
