export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm border-gray-100 flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Sales</p>
          <p className="text-3xl font-bold text-gray-900">₹0</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm border-gray-100 flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm border-gray-100 flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Products</p>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm border-gray-100 flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Published Blogs</p>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl border shadow-sm border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h2>
        <p className="text-gray-500 text-sm">No recent orders found.</p>
      </div>
    </div>
  );
}
