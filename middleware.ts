import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "punchraksha_token";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // 1. User Account + Dashboard route protection
  if (pathname.startsWith("/account") || pathname.startsWith("/dashboard")) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2. Admin Portal route protection (forces AWS Amplify CloudFront to pass Cookie Headers to the Origin)
  if (
    pathname.startsWith("/admin") && 
    !pathname.startsWith("/admin-login") && 
    !pathname.startsWith("/api/admin/auth")
  ) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.redirect(new URL("/admin-login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/admin/:path*"
  ],
};

