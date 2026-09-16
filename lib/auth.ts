import { NextRequest } from "next/server";

/** Returns true when the request carries the correct admin password. */
export function isAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // never allow if unset
  const provided =
    req.headers.get("x-admin-password") ||
    req.nextUrl.searchParams.get("password") ||
    "";
  return timingSafeEqual(provided, expected);
}

export function adminPasswordConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
