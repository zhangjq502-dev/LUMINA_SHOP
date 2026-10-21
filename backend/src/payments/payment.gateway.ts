import { AlipayGateway, ALIPAY_PREFIX } from "./alipay.gateway";
import {
  Injectable,
  ServiceUnavailableException,
  ConflictException,
} from "@nestjs/common";
import Stripe from "stripe";
@Injectable()
export class PaymentGateway {
  private readonly client = process.env.STRIPE_SECRET_KEY?.startsWith(
    "sk_test_",
  )
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;
  constructor(private readonly alipay: AlipayGateway = new AlipayGateway()) {}
  mode() {
    if (process.env.PAYMENT_MODE === "alipay")
      return this.alipay.ready() ? "alipay" : "disabled";
    return this.client && process.env.STRIPE_WEBHOOK_SECRET
      ? "stripe"
      : process.env.NODE_ENV !== "production" &&
          process.env.PAYMENT_MODE === "demo"
        ? "demo"
        : "disabled";
  }
  stripe() {
    if (!this.client)
      throw new ServiceUnavailableException("Stripe 测试环境尚未配置");
    return this.client;
  }
  async close(sessionId: string, expiresAt?: Date) {
    if (sessionId.startsWith(ALIPAY_PREFIX))
      return this.alipay.close(
        sessionId.slice(ALIPAY_PREFIX.length),
        expiresAt,
      );
    const stripe = this.stripe();
    let session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") return session;
    if (session.status === "open") {
      try {
        session = await stripe.checkout.sessions.expire(sessionId);
      } catch {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      }
    }
    if (session.payment_status !== "paid" && session.status !== "expired")
      throw new ConflictException("支付处理中，请稍后重试");
    return session;
  }
}
