"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load orders");
        setOrders(data.orders ?? []);
      } catch (e) {
        toast.error((e instanceof Error ? e.message : "Failed to load orders"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[60px]">
        <h1 className="font-outfit text-[45px] font-semibold tracking-[1.35px] text-text-main">Orders</h1>

        <div className="mt-10 rounded-[13px] border border-black/15 bg-white p-6">
          {loading ? (
            <p className="text-[20px] text-text-muted">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-[20px] text-text-muted">No orders yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map((o) => (
                <Link
                  key={o._id}
                  href={`/account/orders/${o._id}`}
                  className="rounded-[10px] border border-black/10 p-4 hover:bg-black/5"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-outfit text-[18px] font-semibold text-text-main">Order {o._id}</p>
                    <span className="rounded-[10px] bg-primary/10 px-3 py-1 text-[14px] font-semibold text-primary">
                      {o.status}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] text-text-muted">
                    Items: {o.items?.length ?? 0} • Total: ₹{o.total}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

