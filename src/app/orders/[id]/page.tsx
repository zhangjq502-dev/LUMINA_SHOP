import { OrderDetail } from '@/components/shop/ShopScreens';
import { notFound } from 'next/navigation';
const ids = ['LM20261021001','LM20261018002','LM20261012003'];
export const metadata = { title: '订单详情 | LUMINA' };
export function generateStaticParams() { return ids.map(id=>({id})); }
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if(!ids.includes(id)) notFound(); return <OrderDetail id={id}/>; }
