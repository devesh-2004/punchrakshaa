"use client";

import { useAuthStore } from "@/lib/auth/authStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Orders", href: "/dashboard/orders" },
  { label: "Addresses", href: "/dashboard/addresses" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userPhone, userName, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated && mounted) {
      router.push("/");
    }
  }, [isAuthenticated, mounted, router]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="pt-[30px] md:pt-[30px] lg:pt-[30px] min-h-screen font-outfit">
      <div className="lg:mx-[50px] mx-auto flex flex-col lg:flex-row">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-[260px] shrink-0 bg-[#045830] text-white flex-col h-[calc(100vh-120px)] sticky top-[120px]">
          <div className="p-[30px] pb-6 flex items-center gap-4">
            <div className="w-[60px] h-[60px] bg-[#97BDCA] text-white flex shrink-0 items-center justify-center font-bold text-[35px]">
              {userName ? userName.substring(0, 2).toUpperCase() : "US"}
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-normal text-white/90 leading-tight">Hello,</span>
              <span className="text-[20px] font-semibold leading-tight">{userName || "User"}</span>
            </div>
          </div>
          <div className="px-8 pb-4">
            <hr className="border-white/20 border-t" />
          </div>

          <nav className="flex flex-col flex-1 pb-8 px-8 gap-[30px]">
            <Link
              href="/dashboard"
              className={`flex items-center gap-4 text-[20px] transition-colors hover:opacity-80 ${pathname === "/dashboard" ? "font-bold" : "font-normal"
                }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              Profile
            </Link>

            <Link
              href="/dashboard/addresses"
              className={`flex items-center gap-4 text-[20px] transition-colors hover:opacity-80 ${pathname === "/dashboard/addresses" ? "font-bold" : "font-normal"
                }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
              My Address
            </Link>

            <Link
              href="/dashboard/orders"
              className={`flex items-center gap-4 text-[20px] transition-colors hover:opacity-80 ${pathname === "/dashboard/orders" ? "font-bold" : "font-normal"
                }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
              My Orders
            </Link>

            <div className="mt-[40px]">
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="rounded-[5px] border-[1.5px] border-white text-white font-bold text-[20px] tracking-[0.10em] uppercase px-[30px] py-[20px] hover:bg-white hover:text-[#045830] transition-colors flex items-center justify-center"
              >
                LOGOUT
              </button>
            </div>
          </nav>
        </aside>



        {/* Content Area */}
        <main className="flex-1 lg:pl-[25px]">
          {children}
        </main>

      </div>
    </div>
  );
}
