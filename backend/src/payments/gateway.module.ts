import { AlipayGateway } from "./alipay.gateway";
import { Module } from "@nestjs/common";
import { PaymentGateway } from "./payment.gateway";
@Module({
  providers: [AlipayGateway, PaymentGateway],
  exports: [AlipayGateway, PaymentGateway],
})
export class GatewayModule {}
