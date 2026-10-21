import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() list(@Query() query: Record<string, unknown>) {
    return this.products.getPage(query);
  }
  @Get("batch") batch(@Query("ids") ids: unknown) {
    return this.products.getBatch(ids);
  }
  @Get("paginated")
  page(@Query() query: Record<string, unknown>) {
    return this.products.getPage(query);
  }
  @Get(":id") async detail(@Param("id") id: string) {
    const product = await this.products.getProduct(id);
    if (!product) throw new NotFoundException("商品不存在");
    return { product };
  }
}
