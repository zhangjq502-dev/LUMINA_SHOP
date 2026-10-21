import type { Metadata } from 'next';
import './globals.css';
import ShopProvider from '@/components/shop/ShopProvider';
import Header from '@/components/layout/Header/Header';

export const metadata: Metadata = {
  title: 'LUMINA — Considered essentials',
  description: '简约设计，日常穿搭。探索 LUMINA 精选服饰与配件。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><ShopProvider><Header />{children}</ShopProvider></body>
    </html>
  );
}
