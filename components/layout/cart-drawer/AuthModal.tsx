"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

const IS_DEV = process.env.NEXT_PUBLIC_NODE_ENV === "development";

declare global {
  interface Window {
    recaptchaVerifier: any;
    grecaptcha: any;
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone: string) => void;
  isCheckout?: boolean;
}

export function AuthModal({ isOpen, onClose, onSuccess, isCheckout }: AuthModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpMessage, setOtpMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset all state and destroy the verifier when modal closes
      setStep("phone");
      setPhone("");
      setOtp("");
      setConfirmationResult(null);
      setOtpMessage(null);
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch {}
        window.recaptchaVerifier = null;
      }
      return;
    }

    // Pre-render invisible reCAPTCHA as soon as the modal opens.
    // setTimeout(0) ensures the portal has committed <div id="recaptcha-container"> to the DOM.
    const timer = setTimeout(() => {
      if (window.recaptchaVerifier) return;
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(
          firebaseAuth,
          "recaptcha-container",
          { size: "invisible" }
        );
        window.recaptchaVerifier.render();
      } catch (err) {
        console.error("[reCAPTCHA] Pre-render failed:", err);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOtp = async (isResend: boolean = false) => {
    if (phone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      // Fallback: create + render verifier if the useEffect pre-render hasn't fired yet
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(
          firebaseAuth,
          "recaptcha-container",
          { size: "invisible" }
        );
        await window.recaptchaVerifier.render();
      }
      const mobile = `+91${phone}`;
      const confirm = await signInWithPhoneNumber(firebaseAuth, mobile, window.recaptchaVerifier);
      setConfirmationResult(confirm);
      setStep("otp");

      const successText = isResend ? "OTP resent successfully" : "OTP sent successfully";
      setOtpMessage({ type: "success", text: successText });
      setTimeout(() => {
        setOtpMessage((prev) => (prev?.type === "success" && prev?.text === successText ? null : prev));
      }, 4000);

      return true;
    } catch (e) {
      const err = e as any;
      // Log full error details so the real Firebase error code is visible in the console
      console.error("[Firebase Phone Auth] sendOtp failed:", {
        code: err?.code,
        message: err?.message,
        error: e,
      });

      // A reused/stale verifier is a primary cause of auth/too-many-requests.
      // Always destroy completely and recreate so the next attempt gets a fresh token.
      try { window.recaptchaVerifier?.clear(); } catch {}
      window.recaptchaVerifier = null;
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(
          firebaseAuth,
          "recaptcha-container",
          { size: "invisible" }
        );
        await window.recaptchaVerifier.render();
      } catch (reinitErr) {
        console.error("[reCAPTCHA] Reinit after failure failed:", reinitErr);
      }

      const rawMsg = e instanceof Error ? e.message : "Failed to send OTP";
      const cleanMsg = rawMsg.replace(/Firebase:?\s*/i, "").replace(/\s*\(auth\/.*?\)/i, "").trim();
      toast.error(cleanMsg || "Failed to send OTP");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      if (!confirmationResult) throw new Error("Please request OTP first");
      
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();

      const res = await fetch("/api/auth/firebase-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Invalid OTP");
      
      onSuccess(phone);
    } catch (e) {
      console.error(e);
      const rawMsg = (e instanceof Error ? e.message : "Invalid OTP");
      const cleanMsg = rawMsg.replace(/Firebase:?\s*/i, "").replace(/\s*\(auth\/.*?\)/i, "").trim();
      toast.error(cleanMsg || "Invalid OTP");
      setOtpMessage({ type: "error", text: "Enter a valid OTP" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpMessage(null);
    await handleSendOtp(true);
  };

  // ⚠️  DEV-ONLY — bypasses Firebase OTP entirely
  const handleDevLogin = async () => {
    if (phone.length !== 10) {
      toast.error("Enter a 10-digit phone number first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Dev login failed");
      toast.success("Dev login successful!");
      onSuccess(phone);
    } catch (e) {
      toast.error((e instanceof Error ? e.message : "Dev login failed"));
    } finally {
      setLoading(false);
    }
  };



  const modalContent = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex w-full max-w-[850px] overflow-hidden rounded-[16px] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[#767676] hover:bg-black/10 hover:text-black transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Left Side: Branding */}
        <div className="hidden md:flex w-1/2 flex-col items-center justify-center bg-[#045830] p-12 text-center text-white">
          <div className="relative h-[80px] w-[200px] mb-8">
            <Image
              src="/brand/footer-logo.svg"
              alt="PunchRaksha"
              fill
              className="object-contain"
            />
          </div>
          <div className="font-outfit text-[26px] font-semibold leading-tight tracking-wide">
            Welcome to Punchraksh’s Natural Wellness
          </div>
        </div>

        {/* Right Side: Auth Flow */}
        <div className="flex w-full md:w-1/2 flex-col justify-center px-8 py-14 p-12">
          {step === "phone" ? (
            <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-right-4">
              <div className="font-outfit text-[26px] font-semibold text-[#121212] mb-2 text-center text-black">
                {isCheckout ? "Login to Continue" : "Welcome Back"}
              </div>
              {isCheckout ? (
                <div className="font-outfit text-[14px] text-[#767676] mb-6 text-center">
                  Please login to proceed with your order
                </div>
              ) : (
                <div className="mb-6" />
              )}

              <div className="w-full relative flex items-center h-[52px] rounded-[5px] border border-black/20 overflow-hidden focus-within:border-[#045830] transition-colors mb-4">
                <div className="flex shrink-0 items-center justify-center gap-2 bg-[#f8fcf9] px-4 h-full border-r border-black/10 font-outfit text-[16px] font-semibold text-[#121212]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://flagcdn.com/w20/in.png"
                    alt="India Flag"
                    className="w-[20px]"
                  />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  placeholder="Enter Mobile Number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  className="flex-1 h-full px-4 outline-none font-outfit text-[16px] text-[#121212] placeholder:text-[#767676]"
                />
              </div>

              <label className="flex items-center gap-3 w-full mb-8 cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="peer sr-only"
                  />
                  <div className="h-4 w-4 rounded-sm border border-black/30 peer-checked:bg-[#045830] peer-checked:border-[#045830] peer-checked:[&>svg]:opacity-100 transition-colors flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5 text-white opacity-0 transition-opacity"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </div>
                <span className="font-outfit text-[14px] text-[#767676]">
                  Notify me for any updates & offers
                </span>
              </label>

              <button
                onClick={() => handleSendOtp(false)}
                disabled={loading || phone.length !== 10}
                className="w-full h-[52px] rounded-[5px] bg-[#045830] text-white font-outfit text-[16px] font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-6"
              >
                {loading ? "SENDING..." : "GET OTP"}
              </button>

              {/* ⚠️ DEV-ONLY bypass — never shown in production */}
              {IS_DEV && (
                <div className="w-full mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-black/10" />
                    <span className="font-outfit text-[11px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 rounded px-2 py-0.5 uppercase tracking-wider">
                      Dev Only
                    </span>
                    <div className="flex-1 h-px bg-black/10" />
                  </div>
                  <button
                    onClick={handleDevLogin}
                    disabled={loading || phone.length !== 10}
                    className="w-full h-[46px] rounded-[5px] border-2 border-dashed border-orange-400 text-orange-600 bg-orange-50 font-outfit text-[14px] font-bold uppercase tracking-wider hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "LOGGING IN..." : "⚡ Skip OTP (Dev Login)"}
                  </button>
                </div>
              )}

              <div className="text-center font-outfit text-[12px] text-[#767676] leading-relaxed max-w-[80%] mx-auto mb-4">
                By logging in, I agree to Punchraksh’&apos;s{" "}
                <a href="#" className="underline hover:text-[#045830]">
                  Privacy Policy
                </a>{" "}
                ,
                <a href="#" className="underline hover:text-[#045830]">
                  Return Policy
                </a>
                , and{" "}
                <a href="#" className="underline hover:text-[#045830]">
                  T&Cs
                </a>
                .
              </div>

              <a
                href="https://wa.me/917405498441"
                target="_blank"
                className="text-center font-outfit text-[14px] text-[#767676] underline hover:text-[#045830]"
              >
                Trouble logging in?
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-right-4">
              <div className="font-outfit text-[26px] font-bold text-[#121212] mb-3 text-center">
                Verify Mobile Number
              </div>
              <div className="font-outfit text-[14px] text-[#767676] mb-8 text-center">
                OTP sent to +91 {phone}{" "}
                <button
                  onClick={() => setStep("phone")}
                  className="text-[#045830] underline font-semibold ml-1"
                >
                  Edit
                </button>
              </div>

              <div className="w-full relative flex items-center h-[52px] rounded-[5px] border border-black/20 overflow-hidden focus-within:border-[#045830] transition-colors mb-2">
                <input
                  type="text" // using text to allow max length smoothly without arrows
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setOtpMessage(null);
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLInputElement;
                    setTimeout(() => target.setSelectionRange(target.value.length, target.value.length), 0);
                  }}
                  onFocus={(e) => {
                    const target = e.target as HTMLInputElement;
                    setTimeout(() => target.setSelectionRange(target.value.length, target.value.length), 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyOtp();
                    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onKeyUp={(e) => {
                    const target = e.target as HTMLInputElement;
                    setTimeout(() => target.setSelectionRange(target.value.length, target.value.length), 0);
                  }}
                  className="flex-1 h-full px-4 text-center tracking-[10px] outline-none font-outfit text-[20px] font-bold text-[#121212] placeholder:text-[#767676] placeholder:tracking-normal placeholder:font-normal placeholder:text-[16px]"
                />
              </div>

              {/* Message Container: preserves height to avoid layout shift */}
              <div className="h-6 w-full flex items-start justify-center mb-2">
                {otpMessage && (
                  <div
                    className={`flex items-center gap-1.5 font-outfit text-[14px] font-semibold animate-in fade-in duration-300 ${
                      otpMessage.type === "error" ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {otpMessage.type === "error" ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    )}
                    <span>{otpMessage.text}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full h-[52px] rounded-[5px] bg-[#045830] text-white font-outfit text-[16px] font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-6"
              >
                {loading ? "VERIFYING..." : "VERIFY OTP"}
              </button>

              <div className="text-center font-outfit text-[14px] text-[#767676]">
                Didn&apos;t receive code?{" "}
                <button
                  onClick={handleResendOtp}
                  className="text-[#045830] underline font-semibold ml-1"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return null;
}
