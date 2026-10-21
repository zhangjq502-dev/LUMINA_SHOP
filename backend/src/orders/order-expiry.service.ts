import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
@Injectable()
export class OrderExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpiryService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(private readonly orders: OrdersService) {}
  onModuleInit() {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.orders.expireOverdue();
    } catch {
      this.logger.warn("订单过期检查失败，将在下一轮重试");
    } finally {
      this.running = false;
    }
  }
}
