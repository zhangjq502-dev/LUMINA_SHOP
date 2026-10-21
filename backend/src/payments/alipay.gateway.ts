import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { AlipaySdk } from "alipay-sdk";
import { frontendOrigin } from "../config";
// 固定官方沙箱地址，不接受配置成正式网关。
export const ALIPAY_SANDBOX_GATEWAY =
  "https://openapi-sandbox.dl.alipaydev.com/gateway.do";
export const ALIPAY_PREFIX = "alipay:";
export function yuanToCents(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(value))
    throw new BadRequestException("支付宝金额格式无效");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount < 1)
    throw new BadRequestException("支付宝金额无效");
  return amount;
}
@Injectable()
export class AlipayGateway {
  private readonly appId = process.env.ALIPAY_APP_ID ?? "";
  private readonly sellerId = process.env.ALIPAY_SELLER_ID ?? "";
  private readonly notifyUrl = process.env.ALIPAY_NOTIFY_URL ?? "";
  private client: AlipaySdk | null = null;
  ready() {
    if (
      !this.appId ||
      !this.sellerId ||
      !process.env.ALIPAY_PRIVATE_KEY ||
      !process.env.ALIPAY_PUBLIC_KEY
    )
      return false;
    try {
      const url = new URL(this.notifyUrl);
      return (
        url.protocol === "https:" &&
        url.pathname === "/api/payments/alipay/notify" &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }
  sdk() {
    if (!this.ready())
      throw new ServiceUnavailableException(
        "支付宝沙箱未配置，请按配置说明填写本地环境变量",
      );
    return (this.client ??= new AlipaySdk({
      appId: this.appId,
      privateKey: process.env.ALIPAY_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!.replace(/\\n/g, "\n"),
      gateway: ALIPAY_SANDBOX_GATEWAY,
      signType: "RSA2",
      keyType: "PKCS8",
      timeout: 10000,
      camelcase: true,
    }));
  }
  page(number: string, totalCents: number, expiresAt: Date, id: string) {
    // 支付截止时间比库存预留提前一分钟，时间使用支付宝要求的北京时间。
    const deadline = new Date(expiresAt.getTime() - 60000);
    if (deadline.getTime() <= Date.now() + 10000)
      throw new ConflictException("订单即将超时，请取消后重新下单");
    const time = new Date(deadline.getTime() + 8 * 3600000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    return this.sdk().pageExec("alipay.trade.page.pay", "GET", {
      notifyUrl: this.notifyUrl,
      returnUrl: `${frontendOrigin}/orders/${id}?payment=success`,
      bizContent: {
        outTradeNo: number,
        productCode: "FAST_INSTANT_TRADE_PAY",
        subject: `LUMINA 沙箱订单 ${number}`,
        totalAmount: (totalCents / 100).toFixed(2),
        timeExpire: time,
      },
    });
  }
  async query(number: string) {
    const result = await this.sdk().exec(
      "alipay.trade.query",
      { bizContent: { outTradeNo: number } },
      { validateSign: true },
    );
    if (result.code === "40004" && result.subCode === "ACQ.TRADE_NOT_EXIST")
      return { status: "NOT_EXIST", amount: 0 };
    if (result.code !== "10000")
      throw new ServiceUnavailableException("支付宝沙箱查单失败，请稍后重试");
    if (
      result.outTradeNo !== number ||
      (result.sellerId !== undefined && result.sellerId !== this.sellerId)
    )
      throw new BadRequestException("支付宝交易身份不匹配");
    return {
      status: String(result.tradeStatus),
      amount: yuanToCents(result.totalAmount),
    };
  }
  verify(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new BadRequestException("支付宝通知格式无效");
    const fields = body as Record<string, unknown>;
    if (
      Object.values(fields).some((value) => typeof value !== "string") ||
      fields.sign_type !== "RSA2"
    )
      throw new BadRequestException("支付宝通知格式无效");
    if (
      !this.sdk().checkNotifySignV2(fields) ||
      fields.app_id !== this.appId ||
      fields.seller_id !== this.sellerId
    )
      throw new BadRequestException("支付宝通知签名或身份无效");
    if (
      typeof fields.out_trade_no !== "string" ||
      !fields.out_trade_no ||
      typeof fields.trade_no !== "string" ||
      !fields.trade_no
    )
      throw new BadRequestException("支付宝通知缺少交易信息");
    return {
      number: fields.out_trade_no,
      status: fields.trade_status,
      amount: yuanToCents(fields.total_amount),
    };
  }
  async close(number: string, expiresAt?: Date) {
    let trade = await this.query(number);
    const paid = () =>
      ["TRADE_SUCCESS", "TRADE_FINISHED"].includes(trade.status);
    if (!paid() && trade.status !== "TRADE_CLOSED") {
      if (trade.status === "NOT_EXIST") {
        // 签名链接可能已发出但尚未创建交易；未到截止时间不能把“不存在”当成“已关闭”。
        if (!expiresAt || expiresAt.getTime() > Date.now())
          throw new ConflictException(
            "尚未确认支付关闭，请稍后重试取消；超时后会自动处理",
          );
      } else {
        const result = await this.sdk().exec(
          "alipay.trade.close",
          { bizContent: { outTradeNo: number } },
          { validateSign: true },
        );
        if (result.code !== "10000") {
          trade = await this.query(number);
          if (!paid() && trade.status !== "TRADE_CLOSED")
            throw new ConflictException("支付宝交易尚未关闭，请稍后重试");
        }
      }
    }
    return {
      id: ALIPAY_PREFIX + number,
      payment_status: paid() ? "paid" : "unpaid",
      amount_total: trade.amount,
      currency: "cny",
      status: "expired",
    };
  }
}
