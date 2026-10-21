import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
@Injectable()
export class ProductsService {
  constructor(private readonly db: PrismaService) {}
  async getPage(query: Record<string, unknown>) {
    if (
      Object.keys(query).some(
        (key) => !["page", "pageSize", "q", "category", "sort"].includes(key),
      )
    )
      throw new BadRequestException("未知筛选参数");
    const integer = (value: unknown, fallback: number, max: number) => {
      if (value === undefined) return fallback;
      if (typeof value !== "string" || !/^[1-9]\d*$/.test(value))
        throw new BadRequestException("分页参数必须为正整数");
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number > max)
        throw new BadRequestException("分页参数超出范围");
      return number;
    };
    const page = integer(query.page, 1, 100000);
    const pageSize = integer(query.pageSize, 6, 24);
    const text = (value: unknown) => {
      if (value === undefined) return "";
      if (typeof value !== "string" || value.length > 100)
        throw new BadRequestException("筛选参数无效");
      return value.trim();
    };
    const q = text(query.q),
      category = text(query.category),
      sort = text(query.sort) || "default";
    if (!["default", "asc", "desc"].includes(sort))
      throw new BadRequestException("排序参数无效");
    const where = {
      active: true,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { subtitle: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    // 稳定的第二排序键确保相同价格的商品不会在不同页重复出现。
    return this.db.$transaction(
      async (tx) => {
        const total = await tx.product.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const currentPage = Math.min(page, totalPages);
        const rows = await tx.product.findMany({
          where,
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
          orderBy:
            sort === "default"
              ? [{ sortOrder: "asc" }, { id: "asc" }]
              : [
                  { priceCents: sort === "asc" ? "asc" : "desc" },
                  { id: "asc" },
                ],
          include: { skus: { orderBy: { id: "asc" } } },
        });
        const categories = await tx.product.findMany({
          where: { active: true },
          distinct: ["category"],
          select: { category: true },
          orderBy: { category: "asc" },
        });
        return {
          products: this.present(rows),
          total,
          totalPages,
          page: currentPage,
          pageSize,
          categories: categories.map((row) => row.category),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  async getProduct(id: string) {
    const row = await this.db.product.findFirst({
      where: { id, active: true },
      include: { skus: { orderBy: { id: "asc" } } },
    });
    return row ? this.present([row])[0] : null;
  }
  async getBatch(raw: unknown) {
    let ids: unknown;
    try {
      if (typeof raw !== "string") throw new Error();
      ids = JSON.parse(raw);
    } catch {
      throw new BadRequestException("商品 ID 参数无效");
    }
    if (
      !Array.isArray(ids) ||
      ids.length > 100 ||
      ids.some(
        (id) => typeof id !== "string" || id.length < 1 || id.length > 200,
      )
    )
      throw new BadRequestException("最多查询 100 个有效商品 ID");
    const rows = await this.db.product.findMany({
      where: { id: { in: [...new Set(ids as string[])] }, active: true },
      include: { skus: { orderBy: { id: "asc" } } },
    });
    return { products: this.present(rows) };
  }
  private present(
    rows: import("../generated/prisma/client").Prisma.ProductGetPayload<{
      include: { skus: true };
    }>[],
  ) {
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
      category: p.category,
      price: p.priceCents / 100,
      image: p.image,
      color: p.color,
      description: p.description,
      colors: p.colors,
      label: p.label,
      sizes: p.skus.map((s) => s.size),
      skus: p.skus.map(({ id, size, stock, priceCents }) => ({
        id,
        size,
        stock,
        priceCents,
      })),
    }));
  }
}
