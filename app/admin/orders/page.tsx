"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { OrderDoc } from "@/lib/repositories/order.repository";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Total</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o: any) => (
                  <tr key={o._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {o._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{o.shippingAddress.fullName}</div>
                      <div className="text-sm text-gray-500">{o.shippingAddress.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-gray-900">
                      ₹{o.total}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide
                        ${o.status === "paid" ? "bg-green-100 text-green-800" : 
                          o.status === "pending" ? "bg-yellow-100 text-yellow-800" : 
                          o.status === "shipped" ? "bg-blue-100 text-blue-800" : 
                          o.status === "delivered" ? "bg-emerald-100 text-emerald-800" : 
                          "bg-gray-100 text-gray-800"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/orders/${o._id}`} className="inline-flex items-center gap-1 text-[#045830] hover:text-[#034620] font-medium transition text-sm">
                        <Eye size={16} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
