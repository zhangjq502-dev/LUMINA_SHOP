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
};

export const products: Product[] = [
  {
    id: "knit",
    name: "The Everyday Knit",
    subtitle: "柔软针织衫",
    category: "针织",
    price: 399,
    image: "/images/knit.jpg",
    color: "燕麦色",
    description:
      "柔软针织衫，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "BESTSELLER",
  },
  {
    id: "tee",
    name: "The Essential Tee",
    subtitle: "经典棉质 T 恤",
    category: "上衣",
    price: 169,
    image: "/images/tee.jpg",
    color: "云朵白",
    description:
      "经典棉质 T 恤，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "bag",
    name: "The Everyday Tote",
    subtitle: "日常肩包",
    category: "配件",
    price: 599,
    image: "/images/bag.jpg",
    color: "经典黑",
    description:
      "日常肩包，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["均码"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "NEW",
  },
  {
    id: "cardigan",
    name: "The Soft Cardigan",
    subtitle: "轻柔针织开衫",
    category: "针织",
    price: 459,
    image: "/images/cardigan.jpg",
    color: "暖米色",
    description:
      "轻柔针织开衫，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "sweater",
    name: "The Weekend Sweater",
    subtitle: "周末针织上衣",
    category: "针织",
    price: 429,
    image: "/images/sweater.jpg",
    color: "浅灰色",
    description:
      "周末针织上衣，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "shirt",
    name: "The Oxford Shirt",
    subtitle: "经典长袖衬衫",
    category: "上衣",
    price: 329,
    image: "/images/shirt.jpg",
    color: "素白色",
    description:
      "经典长袖衬衫，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "linen-shirt",
    name: "The Linen Shirt",
    subtitle: "轻盈休闲衬衫",
    category: "上衣",
    price: 359,
    image: "/images/linen-shirt.jpg",
    color: "自然色",
    description:
      "轻盈休闲衬衫，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "NEW",
  },
  {
    id: "jacket",
    name: "The Daily Jacket",
    subtitle: "日常休闲夹克",
    category: "外套",
    price: 699,
    image: "/images/jacket.jpg",
    color: "深色",
    description:
      "日常休闲夹克，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "coat",
    name: "The City Coat",
    subtitle: "城市通勤外套",
    category: "外套",
    price: 899,
    image: "/images/coat.jpg",
    color: "经典色",
    description:
      "城市通勤外套，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "denim-jacket",
    name: "The Denim Layer",
    subtitle: "经典牛仔外套",
    category: "外套",
    price: 559,
    image: "/images/denim-jacket.jpg",
    color: "丹宁蓝",
    description:
      "经典牛仔外套，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "jeans",
    name: "The Straight Jeans",
    subtitle: "直筒牛仔裤",
    category: "下装",
    price: 399,
    image: "/images/jeans.jpg",
    color: "水洗蓝",
    description:
      "直筒牛仔裤，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "NEW",
  },
  {
    id: "trousers",
    name: "The Easy Trousers",
    subtitle: "日常休闲长裤",
    category: "下装",
    price: 369,
    image: "/images/trousers.jpg",
    color: "中性色",
    description:
      "日常休闲长裤，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["XS", "S", "M", "L"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "sneakers",
    name: "The Everyday Sneakers",
    subtitle: "日常休闲运动鞋",
    category: "鞋履",
    price: 499,
    image: "/images/sneakers.jpg",
    color: "简约配色",
    description:
      "日常休闲运动鞋，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["36", "37", "38", "39", "40"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "canvas-shoes",
    name: "The Canvas Pair",
    subtitle: "轻便帆布鞋",
    category: "鞋履",
    price: 299,
    image: "/images/canvas-shoes.jpg",
    color: "经典色",
    description:
      "轻便帆布鞋，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["36", "37", "38", "39", "40"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "leather-shoes",
    name: "The Leather Pair",
    subtitle: "通勤皮鞋",
    category: "鞋履",
    price: 699,
    image: "/images/leather-shoes.jpg",
    color: "深棕色",
    description:
      "通勤皮鞋，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["36", "37", "38", "39", "40"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "NEW",
  },
  {
    id: "backpack",
    name: "The Weekend Pack",
    subtitle: "周末双肩包",
    category: "配件",
    price: 459,
    image: "/images/backpack.jpg",
    color: "日常配色",
    description:
      "周末双肩包，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["均码"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "sunglasses",
    name: "The Sun Frame",
    subtitle: "简约太阳镜",
    category: "配件",
    price: 259,
    image: "/images/sunglasses.jpg",
    color: "墨色",
    description:
      "简约太阳镜，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["均码"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
  {
    id: "watch",
    name: "The Everyday Watch",
    subtitle: "经典腕表",
    category: "配件",
    price: 799,
    image: "/images/watch.jpg",
    color: "经典配色",
    description:
      "经典腕表，用简洁的设计搭配日常衣橱。兼顾舒适与实用，为通勤和周末带来轻松的穿搭灵感。图片与商品资料仅用于商城演示。",
    sizes: ["均码"],
    colors: ["#d8cbbb", "#292929", "#eeeae4"],
    label: "",
  },
];

export const categories = [
  "全部",
  ...new Set(products.map((product) => product.category)),
];
export const money = (amount: number) =>
  `¥ ${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
