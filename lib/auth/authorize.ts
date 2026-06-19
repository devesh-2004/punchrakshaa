/**
 * Centralized authorization layer.
 *
 * This wraps the EXISTING auth primitives (JWT cookie in `lib/auth.ts`) and the
 * existing admin rule (`lib/utils/adminAuth.ts`) into one reusable `authorize()`
 * helper with roles + permissions. It intentionally does NOT change the login
 * flow, session/JWT handling, or the existing `requireAdmin()` (which stays in
 * place and is still used everywhere). Adopt `authorize()` for new/centralized
 * checks; existing routes keep working unchanged.
 */
import { getAuthFromRequestCookie, type AuthToken } from "@/lib/auth";
import * as usersRepo from "@/lib/repositories/user.repository";

export type Role = "guest" | "customer" | "admin";

/** Coarse-grained permissions, derived from role. Extend as needed. */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  guest: [],
  customer: ["order:read:self", "review:create", "cart:write:self", "address:write:self"],
  admin: ["*"], // admin implicitly has every permission
};

export interface Principal {
  /** "admin" for the env-admin, otherwise the user's UUID. */
  userId: string;
  role: Role;
  email?: string;
  phone?: string;
}

const ENV_ADMIN_EMAIL = () =>
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "nanobananasanjayshah@gmail.com";

function hasPermission(role: Role, permission?: string): boolean {
  if (!permission) return true;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(permission);
}

/**
 * Resolve the current principal from the JWT cookie. Mirrors the exact rules
 * already used by `requireAdmin()` so behavior is identical:
 *  - env-admin token (role=admin + matching admin email) -> admin
 *  - real DB user with role='admin' -> admin
 *  - any other valid token -> customer
 *  - no/invalid token -> null
 */
export async function getPrincipal(): Promise<Principal | null> {
  const token: AuthToken | null = getAuthFromRequestCookie();
  if (!token) return null;

  if (token.role === "admin" && token.email === ENV_ADMIN_EMAIL()) {
    return { userId: "admin", role: "admin", email: token.email };
  }

  if (token.userId && token.userId !== "admin") {
    const user = await usersRepo.findById(token.userId);
    if (user && user.role === "admin") {
      return { userId: String(user._id), role: "admin", email: user.email, phone: user.phone };
    }
    if (user) {
      return { userId: String(user._id), role: "customer", email: user.email, phone: user.phone };
    }
  }

  // Valid token without a resolvable admin/DB user (e.g. legacy/customer token).
  if (token.userId) {
    return { userId: token.userId, role: "customer", phone: token.phone, email: token.email };
  }
  return null;
}

export interface AuthorizeOptions {
  /** Minimum role required. "admin" requires admin; "customer" requires any logged-in user. */
  role?: Role;
  /** Specific permission required (admin always passes). */
  permission?: string;
}

/**
 * Returns the Principal if the request satisfies the requirements, otherwise
 * `null`. Call sites decide the response (e.g. `jsonBad("Unauthorized", 401)`),
 * preserving each route's existing error contract.
 */
export async function authorize(opts: AuthorizeOptions = {}): Promise<Principal | null> {
  const principal = await getPrincipal();
  if (!principal) return null;

  if (opts.role === "admin" && principal.role !== "admin") return null;
  if (opts.role === "customer" && principal.role === "guest") return null;
  if (!hasPermission(principal.role, opts.permission)) return null;

  return principal;
}
