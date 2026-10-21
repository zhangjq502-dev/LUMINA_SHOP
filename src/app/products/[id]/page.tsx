import { Product } from '@/components/shop/ShopScreens';
import { products } from '@/data/products';
import { notFound } from 'next/navigation';
export function generateStaticParams() { return products.map(p => ({ id: p.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return { title: `${products.find(p=>p.id===id)?.name ?? '商品未找到'} | LUMINA` }; }
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!products.some(p=>p.id===id)) notFound(); return <Product id={id} />; }
