import { getAuthFromRequestCookie } from "@/lib/auth";
import * as usersRepo from "@/lib/repositories/user.repository";

export async function requireAdmin() {
  const token = getAuthFromRequestCookie();
  if (!token) return null;

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "nanobananasanjayshah@gmail.com").toLowerCase();
  if (token.role === "admin" && token.email?.toLowerCase() === adminEmail) {
    return { role: "admin", email: token.email };
  }

  if (token.userId && token.userId !== "admin") {
    const user = await usersRepo.findById(token.userId);
    if (user && user.role === "admin") return user;
  }

  return null;
}
