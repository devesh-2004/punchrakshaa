export function formatPrice(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

