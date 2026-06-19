"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load profile");
        setUser(data.user);
      } catch (e) {
        toast.error((e instanceof Error ? e.message : "Failed to load profile"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[60px]">
        <h1 className="font-outfit text-[45px] font-semibold tracking-[1.35px] text-text-main">My Account</h1>

        <div className="mt-10 max-w-[760px] rounded-[13px] border border-black/15 bg-white p-6">
          {loading ? (
            <p className="text-[20px] text-text-muted">Loading...</p>
          ) : (
            <>
              <p className="text-[16px] text-text-muted">Phone</p>
              <p className="mt-1 font-outfit text-[25px] font-semibold text-text-main">{user?.phone ?? "-"}</p>
              <p className="mt-6 text-[16px] text-text-muted">Name</p>
              <p className="mt-1 font-outfit text-[20px] font-semibold text-text-main">{user?.name || "-"}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

