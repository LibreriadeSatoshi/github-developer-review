import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch("https://api.github.com/rate_limit", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch rate limit" }, { status: res.status });
  }

  const data = await res.json();
  const { remaining, limit, reset } = data.resources.core;

  return NextResponse.json({
    remaining,
    limit,
    resetAt: new Date(reset * 1000).toISOString(),
  });
}
