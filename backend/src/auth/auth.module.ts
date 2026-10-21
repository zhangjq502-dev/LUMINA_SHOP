import { MailService } from "../mail/mail.service";
import { RecoveryService } from "./recovery.service";
import { RecoveryController } from "./recovery.controller";
import { SessionGuard } from "./session.guard";
import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
@Module({
  controllers: [AuthController, RecoveryController],
  providers: [AuthService, SessionGuard, MailService, RecoveryService],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
