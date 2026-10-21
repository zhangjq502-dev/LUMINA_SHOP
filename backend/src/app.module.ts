import { AdminModule } from "./admin/admin.module";
import { AccountModule } from "./account/account.module";
import { PaymentsModule } from "./payments/payments.module";
import { Controller, Get, Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { ProductsModule } from "./products/products.module";
import { OrdersModule } from "./orders/orders.module";
import { SessionController } from "./auth/session.controller";
@Controller("health")
class HealthController {
  @Get() check() {
    return { status: "ok" };
  }
}
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    AccountModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [SessionController, HealthController],
})
export class AppModule {}
