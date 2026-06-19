"use client";

import { useEffect, useState, FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type OrderParam = { params: { id: string } };

export default function OrderDetailsPage({ params }: OrderParam) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/orders/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) {
          setOrder(data.order);
          setStatus(data.order.status);
        }
        setLoading(false);
      });
  }, [params.id]);

  async function handleStatusUpdate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Order status updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading order details...</div>;
  if (!order) return <div>Order not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          Order #{order._id.slice(-8).toUpperCase()}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">Customer Details</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Name:</strong> {order.shippingAddress.fullName}</p>
            <p><strong>Phone:</strong> {order.shippingAddress.phone}</p>
            <p><strong>Address:</strong><br/>
              {order.shippingAddress.addressLine1}<br/>
              {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br/></>}
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">Order Management</h2>
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 bg-gray-50 uppercase text-sm font-semibold tracking-wide"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-2 bg-[#045830] text-white rounded-lg hover:bg-[#034620] transition disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update Status"}
            </button>
          </form>
          
          <div className="mt-6 pt-4 border-t text-sm text-gray-500">
            <p><strong>Razorpay ID:</strong> {order.razorpayOrderId || "N/A"}</p>
            <p><strong>Payment ID:</strong> {order.razorpayPaymentId || "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-sm font-medium text-gray-500">Item</th>
              <th className="px-6 py-4 text-sm font-medium text-gray-500 text-center">Qty</th>
              <th className="px-6 py-4 text-sm font-medium text-gray-500 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item: any, i: number) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.packLabel}</div>
                </td>
                <td className="px-6 py-4 text-center">{item.qty}</td>
                <td className="px-6 py-4 text-right font-medium">₹{item.price}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t">
            <tr>
              <td colSpan={2} className="px-6 py-4 text-right font-medium text-gray-500">Subtotal:</td>
              <td className="px-6 py-4 text-right font-medium">₹{order.subtotal}</td>
            </tr>
            {order.discount > 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-2 text-right font-medium text-red-500">Discount ({order.couponCode}):</td>
                <td className="px-6 py-2 text-right font-medium text-red-500">-₹{order.discount}</td>
              </tr>
            )}
            <tr>
              <td colSpan={2} className="px-6 py-4 text-right font-bold text-gray-900 border-t">Total:</td>
              <td className="px-6 py-4 text-right font-bold text-gray-900 border-t">₹{order.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
