import { getAuthFromRequestCookie } from "@/lib/auth";
import type { AuthToken } from "@/lib/auth";

/**
 * Centralized customer auth guard — mirrors requireAdmin() for customer routes.
 * Returns the decoded JWT payload when a valid session cookie is present,
 * or null when the request is unauthenticated / the token is invalid.
 */
export function requireAuth(): AuthToken | null {
  return getAuthFromRequestCookie();
}
