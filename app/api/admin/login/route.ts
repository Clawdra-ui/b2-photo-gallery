import { NextResponse } from "next/server";
import { setAdminSessionCookie, validateAdminPassword } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { password?: string } | null;

  if (!body?.password || !validateAdminPassword(body.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  setAdminSessionCookie(response);
  return response;
}
