import { Controller, Post, Req, Res, HttpCode } from "@nestjs/common";
import type { Request, Response } from "express";
import { cookieOptions } from "../config";
import { readToken, guestCookie, newToken } from "../common/cookies";
@Controller("session")
export class SessionController {
  @Post() @HttpCode(200) create(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!readToken(req, guestCookie))
      res.cookie(guestCookie, newToken(), {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    return { ready: true };
  }
}
