"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Login failed");
      toast.success("Logged in as Admin");
      router.push("/admin");
    } catch (e) {
      toast.error((e instanceof Error ? e.message : "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full bg-white min-h-screen flex items-center justify-center">
      <div className="w-full max-w-[500px] px-6 py-12">
        <h1 className="font-outfit text-[45px] font-semibold tracking-[1.35px] text-text-main text-center">Admin Login</h1>

        <form onSubmit={login} className="mt-10 rounded-[13px] border border-black/15 bg-white p-6 shadow-sm" suppressHydrationWarning>
          <p className="font-outfit text-[18px] text-text-muted mb-2">Email Address</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="h-[60px] w-full rounded-[10px] border border-black/20 px-5 text-[18px] outline-none mb-6 focus:border-primary"
            required
          />
          
          <p className="font-outfit text-[18px] text-text-muted mb-2">Password</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-[60px] w-full rounded-[10px] border border-black/20 px-5 text-[18px] outline-none mb-8 focus:border-primary"
            required
          />

          <button
            type="submit"
            className="h-[60px] w-full rounded-[15px] bg-primary font-outfit text-[20px] font-semibold uppercase tracking-[2.2px] text-white hover:opacity-90 transition disabled:opacity-50"
            disabled={!email || !password || loading}
            suppressHydrationWarning
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

