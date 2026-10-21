import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrdersModule } from "../orders/orders.module";
import { GatewayModule } from "./gateway.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
@Module({
  imports: [AuthModule, OrdersModule, GatewayModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
