import { OrdersModule } from "../orders/orders.module";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminGuard } from "./admin.guard";
import { AdminController } from "./admin.controller";
@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
