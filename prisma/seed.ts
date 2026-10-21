import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../backend/src/generated/prisma/client";
import { products } from "./data/products";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  for (const [index, p] of products.entries()) {
    const { sizes, price, ...fields } = p;
    const priceCents = Math.round(price * 100);
    await db.product.upsert({
      where: { id: p.id },
      create: { ...fields, priceCents, sortOrder: index },
      update: { ...fields, priceCents, sortOrder: index },
    });
    for (const size of sizes) {
      await db.sku.upsert({
        where: { productId_size: { productId: p.id, size } },
        create: { productId: p.id, size, priceCents, stock: 20 },
        update: { priceCents },
      });
    }
  }
  console.log(
    `Seeded ${products.length} products; existing stock and orders preserved.`,
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
