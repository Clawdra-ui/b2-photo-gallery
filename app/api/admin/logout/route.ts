import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAdminSessionCookie(response);
  return response;
}
