export const products = [
  { id: 'knit', name: 'The Everyday Knit', subtitle: '柔软针织衫', category: '针织', price: 399, image: '/images/knit.jpg', color: '燕麦色', description: '柔软触感与松弛廓形，让每一个普通日常都更舒适。罗纹领口与简洁线条，适合叠穿，也适合单独出场。' },
  { id: 'tee', name: 'The Essential Tee', subtitle: '经典棉质 T 恤', category: '上衣', price: 169, image: '/images/tee.jpg', color: '云朵白', description: '一件值得反复穿着的日常基本款。轻盈棉质面料，搭配恰到好处的宽松剪裁，轻松融入你的衣橱。' },
  { id: 'bag', name: 'The Everyday Tote', subtitle: '日常托特包', category: '配件', price: 599, image: '/images/bag.jpg', color: '焦糖棕', description: '简洁轮廓，容纳日常所需。温润的棕色与实用容量，为通勤和周末留出更多可能。' },
];
export const money = (amount: number) => `¥ ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
