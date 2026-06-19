interface DiscountItem {
  price: number;
  quantity: number;
  upiDiscountPercent?: number;
  upiMaxDiscount?: number;
  cardDiscountPercent?: number;
  cardMaxDiscount?: number;
}

export function calculatePaymentDiscount(
  items: DiscountItem[],
  paymentMethod: "upi" | "card" | "cod"
): number {
  if (paymentMethod === "cod" || items.length === 0) return 0;

  // Use first item's config — "upto ₹X" is a per-order cap, not per-unit
  const first = items[0];
  const upiPct = first.upiDiscountPercent ?? 10;
  const upiMax = first.upiMaxDiscount ?? 60;
  const cardPct = first.cardDiscountPercent ?? 5;
  const cardMax = first.cardMaxDiscount ?? 25;

  const percent = paymentMethod === "upi" ? upiPct : cardPct;
  const maxCap = paymentMethod === "upi" ? upiMax : cardMax;

  const orderSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculated = (orderSubtotal * percent) / 100;
  return Math.min(calculated, maxCap);
}
