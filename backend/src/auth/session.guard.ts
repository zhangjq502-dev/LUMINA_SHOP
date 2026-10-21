import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService, type SafeUser } from "./auth.service";
export type AuthenticatedRequest = Request & { user: SafeUser };
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.auth.getUser(req);
    if (!user) throw new UnauthorizedException("请先登录");
    req.user = user;
    return true;
  }
}
