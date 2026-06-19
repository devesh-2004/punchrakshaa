"use client";

import Script from "next/script";

declare global {
  interface Window {
    HeadlessCheckout?: {
      addToCart: (event: any, token: string, options?: any) => void;
    };
  }
}

export function ShiprocketProvider() {
  return (
    <>
      <input type="hidden" value="punchraksha.com" id="sellerDomain"/>
      <Script
        src="https://checkout-ui.shiprocket.com/assets/js/channels/custom.js"
        strategy="afterInteractive"
      />
    </>
  );
}
