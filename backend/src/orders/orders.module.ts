import { GatewayModule } from "../payments/gateway.module";
import { OrderExpiryService } from "./order-expiry.service";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
@Module({
  imports: [AuthModule, GatewayModule],
  providers: [OrdersService, OrderExpiryService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
