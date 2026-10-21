import { NextResponse } from "next/server";
import {
  guestCookie,
  getGuestHash,
  newGuestToken,
  sameOrigin,
} from "@/lib/guest";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  const response = NextResponse.json({ ready: true });
  if (!(await getGuestHash()))
    response.cookies.set(guestCookie, newGuestToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  return response;
}
