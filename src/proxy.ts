import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicPaths = ["/", "/auth/denied"];

export async function proxy(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.accessToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
