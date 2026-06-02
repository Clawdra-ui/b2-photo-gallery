import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { adminCookieName } from "./utils";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function adminPassword() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("Missing ADMIN_PASSWORD");
  }

  return password;
}

function signSession(timestamp: string) {
  return crypto.createHmac("sha256", adminPassword()).update(`admin-session:${timestamp}`).digest("base64url");
}

export function createAdminSessionValue() {
  const timestamp = Date.now().toString(36);
  return `${timestamp}.${signSession(timestamp)}`;
}

export function verifyAdminSessionValue(value: string | undefined | null) {
  if (!value) return false;

  const [timestamp, signature] = value.split(".");
  if (!timestamp || !signature) return false;

  const expected = signSession(timestamp);

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  return verifyAdminSessionValue(store.get(adminCookieName())?.value);
}

export async function requireAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
}

export async function assertAdminRequest() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export function setAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: adminCookieName(),
    value: createAdminSessionValue(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: adminCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function validateAdminPassword(input: string) {
  const expected = Buffer.from(adminPassword());
  const candidate = Buffer.from(input || "");

  if (expected.length !== candidate.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, expected);
}
