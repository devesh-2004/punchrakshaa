import Link from "next/link";
import { ReactNode } from "react";
import { LayoutDashboard, Package, ShoppingCart, FileText, Settings, FileEdit, Star, Video, SlidersHorizontal } from "lucide-react";
import { requireAdmin } from "@/lib/utils/adminAuth";
import { redirect } from "next/navigation";
import * as reviewsRepo from "@/lib/repositories/review.repository";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/admin-login");
  }

  const pendingReviewCount = await reviewsRepo.countDocuments({ status: "pending" });

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Fixed/Sticky */}
      <aside className="w-64 bg-[#045830] text-white flex flex-col h-screen sticky top-0 shadow-xl z-20">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold tracking-wider font-outfit">PunchRaksha Admin</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <Package size={20} />
            <span className="font-medium">Products</span>
          </Link>
          <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <ShoppingCart size={20} />
            <span className="font-medium">Orders</span>
          </Link>
          <Link href="/admin/blogs" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <FileText size={20} />
            <span className="font-medium">Blogs</span>
          </Link>
          <Link href="/admin/content" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <FileEdit size={20} />
            <span className="font-medium">Pages Context</span>
          </Link>
          <Link href="/admin/testimonials" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <Video size={20} />
            <span className="font-medium">Testimonials</span>
          </Link>
          <Link href="/admin/reviews" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <Star size={20} />
            <span className="font-medium">Reviews</span>
            {pendingReviewCount > 0 && (
              <span className="ml-auto flex items-center justify-center min-w-[22px] h-[22px] px-1 text-xs font-bold bg-orange-500 text-white rounded-full">
                {pendingReviewCount > 99 ? "99+" : pendingReviewCount}
              </span>
            )}
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <SlidersHorizontal size={20} />
            <span className="font-medium">Site Settings</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <a href="/api/auth/logout" className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition font-medium text-white">
            Logout Admin
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-8 shadow-sm justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Control Panel</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="text-sm font-medium text-gray-700">Admin User</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
