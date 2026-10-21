import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
@Module({
  imports: [AuthModule],
  providers: [AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
