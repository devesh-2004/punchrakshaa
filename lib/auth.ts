import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "punchraksha_token";

function getJwtSecret() {
  const secret = process.env.NEXT_PUBLIC_JWT_SECRET || process.env.JWT_SECRET || "punchraksha_secure_jwt_secret_2026_fallback_key";
  return secret;
}

export type AuthToken = { userId: string; phone?: string; role?: string; email?: string };

export function signAuthToken(payload: AuthToken) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getAuthFromRequestCookie(): AuthToken | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret()) as AuthToken;
  } catch {
    return null;
  }
}

export function hashOtp(otp: string) {
  const secret = process.env.NEXT_PUBLIC_JWT_SECRET ?? "dev-secret";
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}

