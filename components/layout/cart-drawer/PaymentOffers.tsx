"use client";

import Image from "next/image";
import { useCartStore } from "@/lib/cart/cartStore";
import { calculatePaymentDiscount } from "@/lib/utils/discountCalc";
import { formatPrice } from "@/lib/utils/formatPrice";

interface PaymentOffersProps {
  onSelect: (method: "upi" | "card" | "cod") => void;
  selectedMethod?: "upi" | "card" | "cod";
}

export function PaymentOffers({
  onSelect,
  selectedMethod,
}: PaymentOffersProps) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const totalMrp = items.reduce((sum, it) => sum + it.mrp * it.quantity, 0);

  const upiDiscount = calculatePaymentDiscount(items, "upi");
  const cardDiscount = calculatePaymentDiscount(items, "card");

  const firstItem = items[0];
  const upiPct = firstItem?.upiDiscountPercent ?? 10;
  const upiMax = firstItem?.upiMaxDiscount ?? 60;
  const cardPct = firstItem?.cardDiscountPercent ?? 5;
  const cardMax = firstItem?.cardMaxDiscount ?? 25;

  const offers = [
    {
      id: "upi",
      title: formatPrice(subtotal - upiDiscount),
      original: formatPrice(subtotal),
      label: "Pay via UPI",
      discount: upiDiscount > 0 ? `${upiPct}% off upto ₹${upiMax}` : "No extra discount",
      logos: "/images/checkout/Group 1171277319.svg",
    },
    {
      id: "card",
      title: formatPrice(subtotal - cardDiscount),
      original: formatPrice(subtotal),
      label: "Pay via Card",
      discount: cardDiscount > 0 ? `${cardPct}% off upto ₹${cardMax}` : "No extra discount",
      logos: "/images/checkout/Group 1171276995.svg",
    },
    {
      id: "cod",
      title: formatPrice(subtotal),
      original: "",
      label: "Cash on Delivery (COD)",
      discount: "Zero Offer",
      other: "/images/checkout/Group 1171276982.svg",
    },
  ];

  return (
    <div className="flex-1 flex flex-col gap-4 py-6 px-[15px] md:px-[30px] overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-4">
        <div className="font-outfit txt-p-lg font-semibold text-[#121212] uppercase !text-[16px] md:!text-[22px]">
          OFFER
        </div>

        {/* Online Payment Banner */}
        <div className="flex items-start gap-3 rounded-[5px] custom-dashed-border bg-[#f8fcf9] p-3 md:p-[10px]">
          <div className="mt-[5px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M23.6704 13.94C23.3804 13.434 23.0884 12.928 22.7984 12.419C22.7278 12.2928 22.6906 12.1506 22.6906 12.006C22.6906 11.8614 22.7278 11.7192 22.7984 11.593L22.9094 11.397C23.0904 11.079 23.2744 10.764 23.4554 10.447C23.5794 10.231 23.7054 10.015 23.8294 9.79698C23.9708 9.54578 24.0271 9.2556 23.99 8.96976C23.9529 8.68391 23.8243 8.41775 23.6234 8.21099C23.4334 8.02099 23.1674 7.89598 22.9364 7.76198L21.9404 7.18898C21.7194 7.06298 21.4414 6.94298 21.2904 6.73298C21.1094 6.47998 21.1314 6.19198 21.1314 5.90098V4.76298C21.1314 4.50299 21.1514 4.23198 21.1144 3.97298C21.0274 3.38098 20.5214 2.94198 19.9364 2.87998C19.6964 2.85498 19.4424 2.87498 19.1994 2.87498H18.0694C17.7734 2.87498 17.4864 2.89198 17.2384 2.69098C17.0404 2.52998 16.9204 2.25098 16.7944 2.03398L16.2214 1.03898C16.0824 0.797985 15.9564 0.527985 15.7454 0.341985C15.5376 0.15799 15.2775 0.0434805 15.0014 0.0144386C14.7253 -0.0146033 14.447 0.0432711 14.2054 0.179985C13.6624 0.484985 13.1244 0.802985 12.5854 1.11298C12.5164 1.15298 12.4494 1.19498 12.3804 1.22998C12.2572 1.29223 12.1205 1.32298 11.9824 1.31949C11.8444 1.316 11.7094 1.27838 11.5894 1.20998C11.3704 1.08798 11.1574 0.961985 10.9394 0.834985C10.6224 0.654985 10.3074 0.470985 9.98945 0.286985C9.67445 0.105985 9.35945 -0.0380153 8.98245 0.00898465C8.52445 0.0659847 8.18245 0.340985 7.95345 0.733985L7.46345 1.58398C7.30645 1.85698 7.14745 2.12998 6.99145 2.40398C6.82345 2.69798 6.55545 2.86998 6.21045 2.86998C5.57545 2.87198 4.94045 2.86998 4.30345 2.86998C3.89145 2.86998 3.49745 2.98098 3.21245 3.29898C3.01421 3.52061 2.89469 3.80148 2.87245 4.09798C2.86545 4.17998 2.87045 4.26399 2.87045 4.34598C2.87045 4.97398 2.87745 5.60098 2.87045 6.22898C2.86745 6.58598 2.66645 6.83698 2.36945 7.00798L1.51345 7.50198L0.703445 7.97098C0.288445 8.20899 0.0134454 8.62099 0.000445387 9.10699C-0.00955461 9.45899 0.150445 9.74498 0.318445 10.037C0.506445 10.362 0.692445 10.69 0.881445 11.017C1.00245 11.228 1.14645 11.439 1.24845 11.66C1.30158 11.7805 1.32564 11.9118 1.31869 12.0433C1.31175 12.1748 1.27398 12.3028 1.20845 12.417C1.16845 12.489 1.12645 12.56 1.08445 12.63C0.782445 13.156 0.472445 13.68 0.174445 14.208C-0.118555 14.731 -0.0335546 15.416 0.417445 15.825C0.615445 16.007 0.876445 16.128 1.10745 16.262L2.10145 16.835C2.32945 16.967 2.59945 17.083 2.74345 17.317C2.90245 17.57 2.87345 17.857 2.87345 18.143V19.286C2.87345 19.547 2.85045 19.822 2.89745 20.08C3.00645 20.67 3.54245 21.103 4.13245 21.13C4.37045 21.14 4.60845 21.13 4.84645 21.13H5.95745C6.26944 21.13 6.56745 21.125 6.81345 21.36C6.99145 21.532 7.10345 21.797 7.22445 22.008C7.41345 22.336 7.60145 22.666 7.79245 22.993C7.93845 23.246 8.07045 23.519 8.30245 23.705C8.51165 23.873 8.76677 23.9737 9.03429 23.9941C9.30182 24.0144 9.56924 23.9534 9.80145 23.819C10.0394 23.685 10.2744 23.546 10.5104 23.409L11.4404 22.874C11.5144 22.832 11.5864 22.782 11.6664 22.747C11.7866 22.6959 11.9169 22.6734 12.0472 22.6812C12.1775 22.689 12.3043 22.7269 12.4174 22.792C12.9604 23.097 13.4984 23.415 14.0374 23.727C14.0984 23.762 14.1574 23.799 14.2204 23.834C14.4954 23.985 14.8034 24.033 15.1104 23.978C15.5344 23.904 15.8424 23.613 16.0504 23.254C16.3704 22.698 16.6904 22.14 17.0124 21.584C17.0886 21.4435 17.2022 21.3267 17.3405 21.2466C17.4789 21.1665 17.6366 21.1261 17.7964 21.13H19.7154C20.1354 21.13 20.5384 21 20.8144 20.666C21.0074 20.43 21.1194 20.142 21.1244 19.835C21.1264 19.765 21.1244 19.693 21.1244 19.624V18.54C21.1244 18.282 21.1214 18.024 21.1244 17.766C21.124 17.6535 21.1464 17.542 21.1902 17.4384C21.234 17.3347 21.2984 17.2411 21.3794 17.163C21.4564 17.088 21.5484 17.036 21.6394 16.984C22.1954 16.664 22.7514 16.346 23.3044 16.024C23.7254 15.781 24.0054 15.342 23.9964 14.848C23.9984 14.506 23.8354 14.23 23.6704 13.94ZM6.89845 8.51898C7.00445 8.09499 7.25545 7.67299 7.59245 7.39298C7.96867 7.07456 8.43365 6.87942 8.92445 6.83398C9.80745 6.74498 10.7344 7.27798 11.1084 8.08198C11.3274 8.54598 11.3814 9.01999 11.2994 9.52398C11.2334 9.94798 11.0024 10.347 10.7094 10.658L10.6844 10.682L10.6524 10.715C9.91145 11.412 8.72245 11.565 7.86245 10.983C7.46765 10.7215 7.1632 10.3445 6.99066 9.90348C6.81813 9.46248 6.78592 8.97897 6.89845 8.51898ZM11.2704 13.766L8.66645 16.371C8.38145 16.657 7.93245 16.637 7.64445 16.371C7.35745 16.106 7.37645 15.617 7.64445 15.349L7.65745 15.337C7.96245 15.019 8.28145 14.711 8.59445 14.399L15.3464 7.64298C15.6324 7.35799 16.0804 7.37799 16.3684 7.64298C16.6564 7.90898 16.6364 8.39699 16.3684 8.66498L16.3564 8.67799C16.0514 8.99499 15.7314 9.30299 15.4184 9.61598L11.2694 13.766H11.2704ZM17.1444 15.364C17.0774 15.788 16.8474 16.19 16.5544 16.498L16.4974 16.555C15.7564 17.252 14.5674 17.405 13.7074 16.825C13.3125 16.5632 13.0081 16.1857 12.8359 15.7443C12.6637 15.3029 12.6321 14.8191 12.7454 14.359C12.8558 13.9213 13.0981 13.5282 13.4394 13.233C13.8145 12.9126 14.2801 12.7172 14.7714 12.674C15.6544 12.585 16.5814 13.121 16.9564 13.922C17.1694 14.386 17.2244 14.858 17.1444 15.364Z"
                fill="#045830"
              />
            </svg>
          </div>
          <div className="font-outfit txt-p-lg font-normal text-[#121212]">
            Pay online :{" "}
            <span className="font-semibold">{Math.max(upiPct, cardPct)}% more discount</span> & Faster
            delivery
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {offers.map((opt) => (
          <div
            key={opt.id}
            className={`p-[8px] transition-all border ${
              selectedMethod === opt.id
                ? "border-[#045830]"
                : "border-transparent"
            }`}
          >
            <button
              onClick={() => onSelect(opt.id as any)}
              className={`relative flex w-full justify-between items-stretch px-[15px] py-[10px] md:py-[15px] md:px-[20px] text-left transition-all ${
                selectedMethod === opt.id ? "bg-[#045830]" : "bg-black"
              } text-white`}
            >
              <div className="flex flex-col justify-center md:justify-between gap-[8px] md:gap-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-outfit text-[25px] md:txt-h1 font-semibold leading-tight">
                    {opt.title}
                  </span>
                  {opt.original && (
                    <span className="font-outfit txt-h2 line-through opacity-60">
                      {opt.original}
                    </span>
                  )}
                </div>
                <div className="font-outfit text-[16px] md:txt-p-lg font-semibold leading-tight">
                  {opt.label}
                </div>
              </div>

              <div className="flex flex-col items-end justify-between md:flex-row md:items-end gap-2 md:gap-4">
                <div
                  className={`px-[10px] py-[5px] md:p-[10px] font-outfit text-[14px] md:text-[20px] mb-[5px] md:mb-[0px] font-medium ${
                    selectedMethod === opt.id ? "bg-[#3b6f58]" : "bg-[#2a2a2a]"
                  }`}
                >
                  {opt.discount}
                </div>
                {opt.logos && (
                  <div className="shrink-0 md:mb-[5px] w-[70px] h-[30px] md:w-[87px] md:h-[37px] mr-[2px] md:mr-[0px]">
                    <Image
                      src={opt.logos}
                      alt="payment icons"
                      width={87}
                      height={37}
                      className="object-contain"
                    />
                  </div>
                )}

                {opt.other && (
                  <div className="shrink-0 md:mb-[5px] w-[30px] h-[30px] md:w-[35px] md:h-[35px] mr-[2px] md:mr-[0px]">
                    <Image
                      src={opt.other}
                      alt="payment icons"
                      width={35}
                      height={35}
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
