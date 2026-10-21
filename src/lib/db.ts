import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  (globalDb.prisma && "user" in globalDb.prisma
    ? globalDb.prisma
    : undefined) ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    }),
  });
if (globalDb.prisma && globalDb.prisma !== db)
  void globalDb.prisma.$disconnect();
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
