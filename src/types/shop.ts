export type Product = {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  price: number;
  image: string;
  color: string;
  description: string;
  sizes: string[];
  colors: string[];
  label: string;
  skus?: { id: string; size: string; stock: number; priceCents: number }[];
};
export const money = (amount: number) =>
  `¥ ${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
export type Order = {
  id: string;
  number: string;
  status: string;
  totalCents: number;
  shippingCents: number;
  expiresAt: string;
  paidAt: string | null;
  paymentSessionId: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  recipient: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  address: string;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    name: string;
    subtitle: string;
    image: string;
    color: string;
    size: string;
    quantity: number;
    unitPriceCents: number;
  }[];
};
export const orderLabels: Record<string, string> = {
  PENDING_PAYMENT: "待付款",
  PAID: "待发货",
  SHIPPED: "运输中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  EXPIRED: "已过期",
};
