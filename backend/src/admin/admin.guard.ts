import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/session.guard";
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (req.user.role !== "ADMIN")
      throw new ForbiddenException("需要管理员权限");
    return true;
  }
}
