import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("pingback_access_token")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (token) {
      return NextResponse.redirect(new URL("/projects", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
