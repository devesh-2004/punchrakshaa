"use client";

import Image from "next/image";
import SafeImage from "@/components/common/SafeImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { useCartStore } from "@/lib/cart/cartStore";
import { useAddToCart } from "@/lib/cart/useAddToCart";
import { useAuthStore } from "@/lib/auth/authStore";
import { formatPrice } from "@/lib/utils/formatPrice";
import { ButtonBase } from "../ui/ButtonBase";
import { loadScript } from "@/lib/utils/loadScript";

// Sub-components for checkout flow
import { CheckoutHeader } from "./cart-drawer/CheckoutHeader";
import { CheckoutFooter } from "./cart-drawer/CheckoutFooter";
import { calculatePaymentDiscount } from "@/lib/utils/discountCalc";
import { AddressList } from "./cart-drawer/AddressList";
import {
  AddAddressForm,
  type NewAddress,
  type AddAddressFormHandle,
} from "./cart-drawer/AddAddressForm";
import { PaymentOffers } from "./cart-drawer/PaymentOffers";
type FlowStep = "cart" | "address-list" | "add-address" | "payment";

export function CartDrawer() {
  const router = useRouter();

  // Cart Store
  const isOpen = useCartStore((s) => s.isOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const itemCount = useCartStore((s) => s.itemCount());
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const addItem = useAddToCart();
  const clearCart = useCartStore((s) => s.clearCart);

  // Address & Checkout Store State
  const addresses = useCartStore((s) => s.addresses);
  const selectedAddressId = useCartStore((s) => s.selectedAddressId);
  const addAddress = useCartStore((s) => s.addAddress);
  const editAddress = useCartStore((s) => s.editAddress);
  const setSelectedAddress = useCartStore((s) => s.setSelectedAddress);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);

  // Local State
  const [flowStep, setFlowStep] = useState<FlowStep>("cart");
  const previousStep = useRef<FlowStep>("cart");
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [upsellProducts, setUpsellProducts] = useState<any[]>([]);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const addAddressFormRef = useRef<AddAddressFormHandle>(null);
  const upsellScrollRef = useRef<HTMLDivElement>(null);
  const upsellTrackRef = useRef<HTMLDivElement>(null);
  const [upsellScrollProgress, setUpsellScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpsellScroll = () => {
    if (upsellScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = upsellScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll <= 0) {
        setUpsellScrollProgress(0);
      } else {
        setUpsellScrollProgress((scrollLeft / maxScroll) * 100);
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !upsellTrackRef.current || !upsellScrollRef.current)
        return;

      const { left, width } = upsellTrackRef.current.getBoundingClientRect();
      let clickPos = (e.clientX - left) / width;
      clickPos = Math.max(0, Math.min(1, clickPos));

      const { scrollWidth, clientWidth } = upsellScrollRef.current;
      upsellScrollRef.current.scrollLeft =
        clickPos * scrollWidth - clientWidth / 2;
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Disable background scroll when drawer is open (iOS-safe body lock)
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY) * -1);
    };
  }, [isOpen]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (upsellTrackRef.current && upsellScrollRef.current) {
      const { left, width } = upsellTrackRef.current.getBoundingClientRect();
      const clickPos = (e.clientX - left) / width;
      const { scrollWidth, clientWidth } = upsellScrollRef.current;

      const scrollTarget = clickPos * scrollWidth - clientWidth / 2;
      upsellScrollRef.current.scrollTo({
        left: scrollTarget,
        behavior: "smooth",
      });
    }
  };

  const scrollUpsell = (direction: "left" | "right") => {
    if (upsellScrollRef.current) {
      const firstCard = upsellScrollRef.current.firstElementChild as HTMLElement;
      const cardWidth = firstCard ? firstCard.offsetWidth + 16 : 276; // card width + gap-4 (16px)
      const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
      upsellScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Helper: records the current step as previous before navigating
  const navigateTo = (next: FlowStep) => {
    previousStep.current = flowStep;
    setFlowStep(next);
  };

  // Payment Options
  const [method, setMethod] = useState<"upi" | "card" | "cod">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<any>(null);

  // Background Script Loading for Razorpay
  useEffect(() => {
    const scriptId = "razorpay-checkout-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Pre-create Razorpay order in the background
  useEffect(() => {
    if (flowStep !== "payment" || method === "cod") {
      setRazorpayOrder(null);
      return;
    }
    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) return;

    const prepareOrder = async () => {
      try {
        const res = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: method,
            shippingAddress: {
              fullName: selectedAddress.name,
              phone: selectedAddress.phone,
              addressLine1: selectedAddress.addressLine1,
              addressLine2: selectedAddress.addressLine2,
              city: selectedAddress.city,
              state: selectedAddress.state,
              pincode: selectedAddress.pincode,
            },
            items: items.map((it) => ({
              productId: it.productId,
              packLabel: it.packLabel || "Default",
              qty: it.quantity,
            })),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setRazorpayOrder(data);
        }
      } catch (e) {
        console.error("Failed to pre-create Razorpay order", e);
      }
    };

    prepareOrder();
  }, [flowStep, method, selectedAddressId, items, addresses]);

  // Fetch upsell products (admin-flagged isUpsellProduct)
  useEffect(() => {
    fetch("/api/products?upsell=true&limit=20")
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          const inCartIds = items.map((it) => it.productId);
          const filtered = data.products.filter(
            (p: any) => !inCartIds.includes(p._id),
          );
          setUpsellProducts(filtered);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const hasItems = items.length > 0;

  // Gift Goal logic: Free gift at ₹1399
  const GIFT_THRESHOLD = 1399;
  const remainingForGift = Math.max(0, GIFT_THRESHOLD - subtotal);
  const giftProgress = Math.min(100, (subtotal / GIFT_THRESHOLD) * 100);

  // MRP logic: Sum of MRPs for savings calc
  const totalMrp = items.reduce((sum, it) => sum + it.mrp * it.quantity, 0);
  const savings = totalMrp - subtotal;

  const summary = useMemo(
    () => ({ subtotal, itemCount, savings, totalMrp }),
    [subtotal, itemCount, savings, totalMrp],
  );

  const paymentDiscount = useMemo(() => {
    return calculatePaymentDiscount(items, method);
  }, [items, method]);

  const handleClose = () => {
    closeDrawer();
    // Reset flow after drawer animation
    setTimeout(() => {
      setFlowStep("cart");
    }, 300);
  };

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      openAuthModal(() => {
        if (addresses.length > 0) {
          navigateTo("address-list");
        } else {
          setEditingAddressId(null);
          navigateTo("add-address");
        }
      });
      return;
    }

    if (addresses.length > 0) {
      navigateTo("address-list");
    } else {
      setEditingAddressId(null);
      navigateTo("add-address");
    }
  };

  // ─── SHIPROCKET QUICK CHECKOUT (commented out — uncomment to re-enable) ─────
  // const handleShiprocketCheckout = async (e: React.MouseEvent) => {
  //   const hc = (window as any).HeadlessCheckout;
  //   console.log('[Checkout] HeadlessCheckout available:', !!hc, Object.keys(hc || {}));
  //   if (!hc || typeof hc.addToCart !== 'function') {
  //     toast.error('Shiprocket checkout is loading. Please try again in a moment.');
  //     return;
  //   }
  //   setIsProcessing(true);
  //   try {
  //     const res = await fetch('/api/shiprocket/checkout-token', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         items: items.map(item => ({
  //           productId: item.productId,
  //           name: item.name,
  //           price: item.price,
  //           mrp: item.mrp,
  //           quantity: item.quantity,
  //         }))
  //       })
  //     });
  //     const data = await res.json();
  //     console.log('[Checkout] Token response:', data);
  //     if (!res.ok) throw new Error(data.error || 'Failed to generate checkout token');
  //     hc.addToCart(e, data.token, { fallbackUrl: window.location.origin });
  //   } catch (err) {
  //     console.error('[Checkout] Error:', err);
  //     toast.error(err.message || 'Checkout failed. Please try again.');
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };
  // ─────────────────────────────────────────────────────────────────────────────

  const payNow = async () => {
    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) {
      toast.error("Please select a delivery address.");
      return;
    }

    if (method === "cod") {
      setIsProcessing(true);
      try {
        const orderId =
          "ORD" + Math.random().toString(36).substr(2, 9).toUpperCase();
        const orderData = {
          orderId,
          items: [...items],
          subtotal,
          totalMrp,
          savings,
          paymentDiscount,
          shippingAddress: selectedAddress,
          paymentMethod: "Cash on delivery",
          date: new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        };

        localStorage.setItem("lastOrder", JSON.stringify(orderData));
        clearCart();
        closeDrawer();
        setTimeout(() => {
          setFlowStep("cart");
          setMethod("upi");
        }, 300);
        router.push("/order-success");
      } catch (e) {
        toast.error((e instanceof Error ? e.message : "Failed to place order"));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Razorpay Flow
    if (typeof window === "undefined" || !(window as any).Razorpay) {
      toast.error("Payment gateway SDK is still loading. Please wait a moment.");
      return;
    }

    setIsProcessing(true);
    let orderToUse = razorpayOrder;

    if (!orderToUse) {
      try {
        const res = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: method,
            shippingAddress: {
              fullName: selectedAddress.name,
              phone: selectedAddress.phone,
              addressLine1: selectedAddress.addressLine1,
              addressLine2: selectedAddress.addressLine2,
              city: selectedAddress.city,
              state: selectedAddress.state,
              pincode: selectedAddress.pincode,
            },
            items: items.map((it) => ({
              productId: it.productId,
              packLabel: it.packLabel || "Default",
              qty: it.quantity,
            })),
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.error || "Failed to create payment order");
        }
        orderToUse = await res.json();
      } catch (e) {
        toast.error((e instanceof Error ? e.message : "Failed to initiate payment"));
        setIsProcessing(false);
        return;
      }
    }

    // Convert UI amount to paise as strict fallback/validation
    const finalAmountPaise = Math.round((subtotal - paymentDiscount) * 100);

    const options: any = {
      key: orderToUse.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: orderToUse.amount || finalAmountPaise,
      currency: orderToUse.currency || "INR",
      name: "PunchRaksha",
      description: "Checkout Payment",
      order_id: orderToUse.razorpayOrderId,
      prefill: {
        name: selectedAddress.name,
        contact: selectedAddress.phone,
        method: method
      },
      handler: async function (response: any) {
        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData?.error || "Payment verification failed");

          const orderData = {
            orderId: orderToUse.orderId,
            items: [...items],
            subtotal,
            totalMrp,
            savings,
            paymentDiscount,
            shippingAddress: selectedAddress,
            paymentMethod: "Prepaid",
            date: new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          };

          localStorage.setItem("lastOrder", JSON.stringify(orderData));
          clearCart();
          closeDrawer();
          setTimeout(() => {
            setFlowStep("cart");
            setMethod("upi");
          }, 300);
          router.push("/order-success");
        } catch (err) {
          toast.error((err instanceof Error ? err.message : "Payment verification failed"));
        } finally {
          setIsProcessing(false);
        }
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
        },
      },
      theme: {
        color: "#045830",
      },
    };

    // Preselect payment method dynamically
    if (method === "upi") {
      options.method = { upi: true };
      options.config = {
        display: {
          blocks: {
            upi: {
              name: "Pay via UPI",
              instruments: [{ method: "upi" }]
            }
          },
          sequence: ["block.upi"],
          preferences: {
            show_default_blocks: false,
          },
        },
      };
    } else {
      options.method = { card: true };
      options.config = {
        display: {
          blocks: {
            card: {
              name: "Pay via Card",
              instruments: [{ method: "card" }]
            }
          },
          sequence: ["block.card"],
          preferences: {
            show_default_blocks: false,
          },
        },
      };
    }

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleBack = () => {
    if (flowStep === "payment") {
      setFlowStep("address-list");
    } else if (flowStep === "add-address") {
      // Go back to wherever we came from (cart or address-list)
      setFlowStep(previousStep.current);
    } else if (flowStep === "address-list") {
      setFlowStep("cart");
    }
  };

  const handleSaveAddress = (val: NewAddress) => {
    // Map NewAddress to cartStore Address
    const addressData = {
      name: val.fullName,
      phone: val.phone,
      addressLine1: val.address,
      city: val.city,
      state: val.state,
      pincode: val.pincode,
      isDefault: addresses.length === 0, // Auto default first address
      type: val.type,
    };
    if (editingAddressId) {
      const existingAddress = addresses.find((a) => a.id === editingAddressId);
      editAddress(editingAddressId, {
        ...addressData,
        isDefault: existingAddress?.isDefault || false,
      });
    } else {
      const id = addAddress(addressData);
      setSelectedAddress(id);
    }
    setEditingAddressId(null);
    setFlowStep("payment");
  };

  return (
    <div
      className={`fixed inset-0 z-[110] ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-150 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
        style={{ touchAction: "none" }}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-[567px] max-w-[93vw] md:max-w-[100vw] bg-white shadow-[0px_0px_15px_0px_rgba(0,0,0,0.15)] transition-transform duration-200 will-change-transform flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── TOP: flexible section — shrinks when footer/upsell section grows ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* Dynamic Header */}
        {flowStep === "cart" ? (
          <div className="flex h-[45px] md:h-[60px] items-center justify-between border-b border-black/10 px-[15px] md:px-[30px] shrink-0">
            <div className="font-outfit txt-p-lg font-medium text-[#121212] flex items-center gap-[10px] ">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="star-rating-img"
              >
                <path
                  d="M10 22L23.08 20.9095C27.1735 20.569 28.0915 19.675 28.5445 15.5935L29.5 7M7 7H31M10 28C10 29.6569 8.65685 31 7 31C5.34315 31 4 29.6569 4 28C4 26.3431 5.34315 25 7 25C8.65685 25 10 26.3431 10 28ZM10 28H20.5M20.5 28C20.5 29.6569 21.8431 31 23.5 31C25.1569 31 26.5 29.6569 26.5 28C26.5 26.3431 25.1569 25 23.5 25C21.8431 25 20.5 26.3431 20.5 28ZM1 1H2.449C3.8665 1 5.101 1.9375 5.4445 3.2725L9.91 20.614C10.135 21.4915 9.9415 22.42 9.385 23.143L7.9465 25"
                  stroke="#121212"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Your items ({summary.itemCount}{" "}
              {summary.itemCount === 1 ? "Item" : "Items"})
            </div>
            <button
              aria-label="Close cart"
              className="p-1 hover:opacity-70 transition-opacity"
              onClick={handleClose}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#121212"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="star-rating-img"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ) : (
          <CheckoutHeader onBack={handleBack} />
        )}

        {/* Free Gift Banner design section (Only shown in cart) */}
        {hasItems && flowStep === "cart" && (
          <div
            className="text-white py-[15px] md:py-[20px] px-[15px] md:px-[30px] shrink-0 font-outfit relative overflow-hidden bg-no-repeat bg-cover bg-center"
            style={{ backgroundImage: "url(/images/product/checkout-bg.svg)" }}
          >
            <div className="absolute inset-0 backdrop-blur-[100px] bg-black/10 z-0" />
            <div className="relative z-10">
              <div className="text-center txt-p font-medium md:mb-1">
                {remainingForGift > 0
                  ? `You are only ${formatPrice(remainingForGift)} away from getting a FREE Shilajit worth ₹599`
                  : "Congratulations! You've unlocked a FREE Shilajit!"}
              </div>

              <div className="relative md:pt-2">
                <div className="flex justify-end">
                  <span className="text-[#FFD700] txt-p-lg font-semibold">
                    ₹1,400
                  </span>
                </div>
                <div className="relative flex items-center h-8 px-1">
                  <div className="w-4 h-4 bg-white rounded-full z-20 shrink-0 shadow-[0_0_4px_rgba(0,0,0,0.2)] mr-[5px]" />
                  <div className="flex-1 relative mx-[-2px] h-[4px] flex items-center">
                    <div className="absolute inset-0 border-b-2 border-dashed border-white/60 top-[-5px]" />
                    <div
                      className="absolute left-0 top-[1px] h-[5px] bg-[#FFD700] transition-all duration-700 ease-out z-10"
                      style={{ width: `${giftProgress}%` }}
                    />
                  </div>
                  <div className="shrink-0 z-20 pr-[1px]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                    >
                      <path
                        d="M17.438 7.242C17.8127 7.758 18 8.344 18 9C18 9.984 17.813 10.254 17.438 10.793C17.0808 11.2959 16.5773 11.6766 15.996 11.883C16.254 12.445 16.3243 13.0543 16.207 13.711C16.1141 14.3392 15.8176 14.9196 15.363 15.363C14.8943 15.8317 14.3437 16.113 13.711 16.207C13.0946 16.3262 12.4564 16.2529 11.883 15.997C11.743 16.3943 11.532 16.734 11.25 17.016C10.9687 17.32 10.6287 17.5543 10.23 17.719C9.84795 17.9085 9.42644 18.0048 9 18C8.35818 18.0044 7.73112 17.8075 7.207 17.437C6.70438 17.0804 6.3238 16.5776 6.117 15.997C5.54364 16.2529 4.90545 16.3262 4.289 16.207C3.66078 16.1141 3.0804 15.8176 2.637 15.363C2.18046 14.9162 1.87311 14.3392 1.757 13.711C1.65812 13.0906 1.74402 12.4549 2.004 11.883C1.42307 11.6764 0.919908 11.2958 0.563 10.793C0.187667 10.253 0 9.65533 0 9C0 8.017 0.188 7.758 0.563 7.242C0.938333 6.70333 1.41833 6.32833 2.003 6.117C1.74482 5.557 1.65952 4.93273 1.758 4.324C1.87533 3.668 2.16833 3.10567 2.637 2.637C3.0804 2.18238 3.66078 1.88586 4.289 1.793C4.945 1.67633 5.55433 1.74633 6.117 2.003C6.3238 1.42243 6.70438 0.919645 7.207 0.563C7.747 0.187667 8.34467 0 9 0C9.983 0 10.242 0.188 10.758 0.563C11.2973 0.938333 11.6723 1.41833 11.883 2.003C12.4437 1.74604 13.0711 1.67255 13.676 1.793C14.3167 1.87847 14.9104 2.17553 15.363 2.637C15.8317 3.105 16.113 3.66733 16.207 4.324C16.3243 4.95667 16.2543 5.55433 15.997 6.117C16.5817 6.32833 17.0627 6.70333 17.438 7.242ZM7.523 5.977C7.313 5.74233 7.05533 5.625 6.75 5.625C6.292 5.625 6.176 5.742 5.941 5.977C5.73033 6.187 5.625 6.44467 5.625 6.75C5.625 7.208 5.73 7.324 5.941 7.559C6.17567 7.76967 6.44533 7.875 6.75 7.875C7.207 7.875 7.313 7.77 7.523 7.559C7.75767 7.32433 7.875 7.05467 7.875 6.75C7.875 6.293 7.758 6.188 7.523 5.977ZM7.172 12.023L12.023 7.172C12.281 6.914 12.281 6.656 12.023 6.398L11.602 5.977C11.344 5.719 11.086 5.719 10.828 5.977L5.977 10.828C5.719 11.086 5.719 11.344 5.977 11.602L6.398 12.023C6.656 12.281 6.914 12.281 7.172 12.023ZM10.442 12.059C10.6753 12.2697 10.9447 12.375 11.25 12.375C11.5553 12.375 11.813 12.2697 12.023 12.059C12.2577 11.8243 12.375 11.5547 12.375 11.25C12.375 10.9453 12.2577 10.6877 12.023 10.477C11.9279 10.3652 11.8093 10.2757 11.6757 10.2149C11.5421 10.154 11.3968 10.1233 11.25 10.125C10.9453 10.125 10.6757 10.2423 10.441 10.477C10.2303 10.687 10.125 10.9447 10.125 11.25C10.125 11.5547 10.2303 11.8243 10.441 12.059"
                        fill="white"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[12px] font-bold">
                  <div className="flex items-center gap-1.5 opacity-95 txt-p font-normal w-full mr-[20px] md:mr-0 text-center">
                    <span>
                      🎁&nbsp; FREE Shilajit worth ₹599 on Orders Above ₹
                      {GIFT_THRESHOLD} &nbsp;🎁
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[#FFD700]">
                    <span className="txt-p-lg font-semibold">Free</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Body */}
        {flowStep === "cart" && (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-[10px] md:py-[20px] px-[15px] md:px-[30px]">
            {!hasItems ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ccc"
                    strokeWidth="1.5"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <div className="font-outfit txt-h3-lg text-[#121212]">
                  Your cart is empty
                </div>
                <div className="mt-2 text-[#767676] txt-p-lg">
                  Add a product to get started.
                </div>
                <Link
                  href="/products"
                  onClick={handleClose}
                  className="mt-8 inline-flex h-[52px] items-center justify-center btn-radius-15 bg-[#045830] px-8 font-outfit text-[16px] font-bold uppercase tracking-[1.5px] text-white transition-transform hover:scale-105"
                >
                  Browse products
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-6">
                  {items.map((it) => (
                    <div
                      key={`${it.productId}-${it.packLabel}`}
                      className="flex gap-[15px] group"
                    >
                      <div className="relative h-[105px] w-[105px] md:h-[140px] md:w-[140px] shrink-0 overflow-hidden btn-radius-10 border border-black/5 bg-[#f8fcf9] shadow-sm">
                        <Image
                          src={it.image}
                          alt={it.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-outfit txt-p-lg font-semibold text-[#121212] md:mb-[2px]">
                          {it.name}
                          {/* {it.secondaryName && (
                            <span className="font-normal ml-1">
                              {it.secondaryName}
                            </span>
                          )} */}
                        </div>
                        <div className="font-outfit txt-p text-[#121212] font-medium tracking-wide md:mb-[2px]">
                          Size: {it.packLabel}
                        </div>

                        <div className="flex items-baseline gap-[5px] md:mb-[2px]">
                          <div className="font-outfit txt-p-lg text-[#121212] font-bold">
                            {formatPrice(it.price)}
                          </div>
                          {it.mrp > it.price && (
                            <div className="font-outfit txt-p text-[#767676] line-through font-semibold">
                              {formatPrice(it.mrp)}
                            </div>
                          )}
                        </div>

                        <div className="mt-[10px] md:mt-3 flex items-center gap-[20px]">
                          <div className="flex items-center h-[32px] md:h-[38px] border border-[#121212] rounded-[5px] bg-white overflow-hidden shadow-sm text-[#767676]">
                            <button
                              className="h-full w-[32px] md:w-[38px] flex items-center justify-center border-r border-[#121212] hover:bg-gray-50 txt-p-lg font-medium bg-[#EBEBEB] "
                              onClick={() =>
                                updateQty(
                                  it.productId,
                                  it.packLabel,
                                  it.quantity - 1,
                                )
                              }
                            >
                              −
                            </button>
                            <div className="w-[32px] md:w-[66px] text-center font-outfit txt-p-lg font-bold">
                              {it.quantity}
                            </div>
                            <button
                              className="h-full w-[32px] md:w-[35px] flex items-center justify-center border-l border-[#121212] hover:bg-gray-50 txt-p-lg font-medium transition-colors bg-[#EBEBEB] "
                              onClick={() =>
                                updateQty(
                                  it.productId,
                                  it.packLabel,
                                  it.quantity + 1,
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                          <button
                            className="font-outfit txt-p-lg text-[#121212] font-semibold underline underline-offset-4 hover:text-[#3D8F45] transition-colors"
                            onClick={() =>
                              removeItem(it.productId, it.packLabel)
                            }
                          >
                            remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        )}

        {flowStep === "address-list" && (
          <AddressList
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelect={setSelectedAddress}
            onEdit={(id) => {
              setEditingAddressId(id);
              navigateTo("add-address");
            }}
            onAddNew={() => {
              setEditingAddressId(null);
              navigateTo("add-address");
            }}
          />
        )}

        {flowStep === "add-address" && (
          <AddAddressForm
            key={editingAddressId || "new"}
            ref={addAddressFormRef}
            isEdit={!!editingAddressId}
            initialValue={
              editingAddressId
                ? (() => {
                    const addr = addresses.find(
                      (a) => a.id === editingAddressId,
                    );
                    if (!addr) return undefined;
                    return {
                      fullName: addr.name,
                      phone: addr.phone,
                      address: addr.addressLine1,
                      city: addr.city,
                      state: addr.state,
                      pincode: addr.pincode,
                      type: addr.type as "Home" | "Office" | "Other",
                    };
                  })()
                : undefined
            }
            onSave={handleSaveAddress}
          />
        )}

        {flowStep === "payment" && (
          <PaymentOffers onSelect={setMethod} selectedMethod={method} />
        )}

        {false && (
          <div>
            <div
              className="px-[18px] md:px-[30px]"
            >
              <div
                ref={upsellScrollRef}
                onScroll={handleUpsellScroll}
                className="flex gap-4 overflow-x-auto no-scrollbar pb-[10px] pr-4 snap-x snap-mandatory scroll-smooth touch-scroll"
              >
                {upsellProducts.map((p) => {
                  const firstPack = p.packOptions?.[0];
                  return (
                    <div
                      key={p._id}
                      className="md:min-w-[420px] bg-[#effbf3] rounded-[15px] p-[5px] md:p-[10px] border-[1px] border-[#121212]/50 flex gap-[10px] items-center snap-start pr-[10px]"
                    >
                      <div className="relative h-[80px] w-[80px] md:h-[120px] md:w-[120px] shrink-0 btn-radius-10 overflow-hidden border border-black/5 bg-white">
                        <Image
                          src={p.images?.[0]?.url}
                          alt={p.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                        <div>
                          <div className="font-outfit txt-p-lg font-medium text-[#121212] line-clamp-1">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-[5px] mb-[3px] md:mt-[5px] md:mb-[10px]">
                            <span className="font-outfit txt-p-lg font-bold text-[#121212]">
                              {formatPrice(firstPack?.price)}
                            </span>
                            <span className="font-outfit txt-p text-[#767676] line-through font-semibold">
                              {formatPrice(firstPack?.mrp)}
                            </span>
                          </div>
                        </div>
                        <ButtonBase
                          onClick={() =>
                            addItem({
                              productId: p._id,
                              name: p.name,
                              secondaryName: p.secondaryName,
                              packLabel: firstPack?.label || "PACK of 1",
                              price: firstPack?.price,
                              mrp: firstPack?.mrp,
                              upiDiscountPercent: p.upiDiscountPercent || 10,
                              upiMaxDiscount: p.upiMaxDiscount || 60,
                              cardDiscountPercent: p.cardDiscountPercent || 5,
                              cardMaxDiscount: p.cardMaxDiscount || 25,
                              image: p.images?.[0]?.url,
                            })
                          }
                          className="!flex-0 py-[8px] md:!py-[10px] md:flex-1 w-[148px] md:w-full h-[31px] md:h-[48px] bg-black text-white txt-p-lg font-bold !btn-radius-5"
                        >
                          ADD TO CART
                        </ButtonBase>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 px-1 mb-[10px]">
                <button
                  onClick={() => scrollUpsell("left")}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors active:scale-90"
                  aria-label="Scroll left"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="13"
                    viewBox="0 0 10 13"
                    fill="none"
                  >
                    <path
                      d="M10 13L-2.38419e-07 6.5L10 2.38419e-07L10 13Z"
                      fill="#121212"
                      fillOpacity="0.5"
                    />
                  </svg>
                </button>
                <div
                  ref={upsellTrackRef}
                  onClick={handleTrackClick}
                  className="flex-1 h-[13px] bg-[#D9D9D9] rounded-full relative overflow-hidden cursor-pointer select-none"
                >
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    className={`absolute top-0 h-full bg-[#767676] rounded-full shadow-sm will-change-transform ${isDragging ? "cursor-grabbing" : "cursor-grab transition-transform duration-75 ease-out"}`}
                    style={{
                      width: "30%",
                      transform: `translateX(${(upsellScrollProgress * 70) / 30}%)`,
                    }}
                  />
                </div>
                <button
                  onClick={() => scrollUpsell("right")}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors active:scale-90"
                  aria-label="Scroll right"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="13"
                    viewBox="0 0 10 13"
                    fill="none"
                  >
                    <path
                      d="M0 0L10 6.5L0 13L0 0Z"
                      fill="#121212"
                      fillOpacity="0.5"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        </div>{/* END top flexible section */}

        {/* Last Minute Checkout — fixed strip above footer, never scrolls */}
        {hasItems && flowStep === "cart" && upsellProducts.length > 0 && (
          <div className="shrink-0 bg-[#f1f8f4]/30">
            <button
              onClick={() => setIsUpsellOpen((v) => !v)}
              className="w-full bg-[#effbf3] border-t border-b border-[#045830] py-[8px] md:py-[10px] flex items-center justify-between px-[15px] md:px-[30px]"
            >
              <div className="flex items-center gap-2">
                <span className="text-[16px]">⏰</span>
                <div className="font-outfit txt-p-lg font-medium text-[#121212]">Last Minute Checkout</div>
                <span className="text-[16px]">⏰</span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 23"
                fill="none"
                className={`h-[10px] w-[16px] md:h-[16px] md:w-[20px] transition-transform duration-300 ${isUpsellOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M9.24376 17.1359L0.567734 8.40559C0.149297 7.98454 0.149297 7.30191 0.567734 6.8809L1.57965 5.86265C1.99738 5.44232 2.67439 5.44151 3.09309 5.86086L10.0014 12.7798L16.9097 5.86086C17.3284 5.44151 18.0054 5.44232 18.4231 5.86265L19.435 6.8809C19.8534 7.30195 19.8534 7.98458 19.435 8.40559L10.759 17.1359C10.3406 17.5569 9.6622 17.5569 9.24376 17.1359Z"
                  fill="#045830"
                />
              </svg>
            </button>
            {isUpsellOpen && (
            <div className="px-[15px] md:px-[30px] py-[10px]">
              <div
                ref={upsellScrollRef}
                onScroll={handleUpsellScroll}
                className="flex gap-4 overflow-x-auto no-scrollbar pb-[10px] pr-4 snap-x snap-mandatory scroll-smooth touch-scroll"
              >
                {upsellProducts.map((p) => {
                  const firstPack = p.packOptions?.[0];
                  return (
                    <div
                      key={p._id}
                      className="min-w-[260px] md:min-w-[420px] bg-[#effbf3] rounded-[15px] p-[5px] md:p-[10px] border border-[#121212]/50 flex gap-[10px] items-center snap-start pr-[10px]"
                    >
                      <div className="relative h-[80px] w-[80px] md:h-[120px] md:w-[120px] shrink-0 btn-radius-10 overflow-hidden border border-black/5 bg-white">
                        <SafeImage src={p.images?.[0]?.url} alt={p.name} fill className="object-contain" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                        <div>
                          <div className="font-outfit txt-p-lg font-medium text-[#121212] line-clamp-1">{p.name}</div>
                          <div className="flex items-center gap-[5px] mb-[3px] md:mt-[5px] md:mb-[10px]">
                            <span className="font-outfit txt-p-lg font-bold text-[#121212]">{formatPrice(firstPack?.price)}</span>
                            <span className="font-outfit txt-p text-[#767676] line-through font-semibold">{formatPrice(firstPack?.mrp)}</span>
                          </div>
                        </div>
                        <ButtonBase
                          onClick={() => addItem({ productId: p._id, name: p.name, secondaryName: p.secondaryName, packLabel: firstPack?.label || "PACK of 1", price: firstPack?.price, mrp: firstPack?.mrp, upiDiscountPercent: p.upiDiscountPercent || 10, upiMaxDiscount: p.upiMaxDiscount || 60, cardDiscountPercent: p.cardDiscountPercent || 5, cardMaxDiscount: p.cardMaxDiscount || 25, image: p.images?.[0]?.url })}
                          className="!flex-0 py-[8px] md:!py-[10px] md:flex-1 w-[148px] md:w-full h-[31px] md:h-[48px] bg-black text-white txt-p-lg font-bold !btn-radius-5"
                        >
                          ADD TO CART
                        </ButtonBase>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 px-1 mt-[4px]">
                <button onClick={() => scrollUpsell("left")} className="p-1 hover:bg-black/5 rounded-full transition-colors active:scale-90" aria-label="Scroll left">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="13" viewBox="0 0 10 13" fill="none"><path d="M10 13L-2.38419e-07 6.5L10 2.38419e-07L10 13Z" fill="#121212" fillOpacity="0.5" /></svg>
                </button>
                <div ref={upsellTrackRef} onClick={handleTrackClick} className="flex-1 h-[13px] bg-[#D9D9D9] rounded-full relative overflow-hidden cursor-pointer select-none">
                  <div onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); }} className={`absolute top-0 h-full bg-[#767676] rounded-full shadow-sm will-change-transform ${isDragging ? "cursor-grabbing" : "cursor-grab transition-transform duration-75 ease-out"}`} style={{ width: "30%", transform: `translateX(${(upsellScrollProgress * 70) / 30}%)` }} />
                </div>
                <button onClick={() => scrollUpsell("right")} className="p-1 hover:bg-black/5 rounded-full transition-colors active:scale-90" aria-label="Scroll right">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="13" viewBox="0 0 10 13" fill="none"><path d="M0 0L10 6.5L0 13L0 0Z" fill="#121212" fillOpacity="0.5" /></svg>
                </button>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ── Unified sticky footer — same component across ALL steps ── */}
        {hasItems && flowStep === "cart" && (
          <CheckoutFooter
            subtotal={summary.subtotal}
            savings={summary.savings}
            totalMrp={summary.totalMrp}
            onAction={handleCheckoutClick}
            actionText="CHECKOUT"
            isProcessing={isProcessing}
          />
        )}

        {/* Add-address footer */}
        {hasItems && flowStep === "add-address" && (
          <CheckoutFooter
            subtotal={summary.subtotal}
            savings={summary.savings}
            totalMrp={summary.totalMrp}
            onAction={() => addAddressFormRef.current?.submit()}
            actionText={editingAddressId ? "SAVE ADDRESS" : "SAVE & CONTINUE"}
            isProcessing={isProcessing}
            isAddAddressStep={true}
            savingsInsideDetails={true}
          />
        )}

        {/* Address-list footer */}
        {hasItems && flowStep === "address-list" && (
          <CheckoutFooter
            subtotal={summary.subtotal}
            savings={summary.savings}
            totalMrp={summary.totalMrp}
            onAction={() => {
              if (!selectedAddressId) {
                toast.error("Please select a delivery address.");
                return;
              }
              setFlowStep("payment");
            }}
            actionText="PAYMENT"
            isProcessing={isProcessing}
          />
        )}

        {/* Payment footer */}
        {hasItems && flowStep === "payment" && (
          <CheckoutFooter
            subtotal={summary.subtotal}
            savings={summary.savings}
            totalMrp={summary.totalMrp}
            paymentDiscount={paymentDiscount}
            onAction={payNow}
            actionText="PLACE ORDER"
            isProcessing={isProcessing}
            savingsInsideDetails={true}
          />
        )}
      </aside>
    </div>
  );
}
