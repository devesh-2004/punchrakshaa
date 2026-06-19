import Razorpay from "razorpay";

export function getRazorpayClient() {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Missing Razorpay keys");
  return new Razorpay({ key_id, key_secret });
}

