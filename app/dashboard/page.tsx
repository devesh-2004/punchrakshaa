"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/auth/authStore";

export default function DashboardOverview() {
  const { userName, userPhone, login, updateProfile } = useAuthStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [loading, setLoading] = useState(true);

  // OTP modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpArray, setOtpArray] = useState(["", "", "", "", "", ""]);
  const [pendingPhone, setPendingPhone] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user");
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setName(data.user?.name ?? "");
          setPhone(data.user?.phone ?? "");
          setOriginalName(data.user?.name ?? "");
          setOriginalPhone(data.user?.phone ?? "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const startResendTimer = () => {
    setResendTimer(30);
    const id = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const sendPhoneOtp = async (targetPhone: string) => {
    const res = await fetch("/api/user/phone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: targetPhone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Failed to send OTP");
  };

  const handleSave = async () => {
    const cleanPhone = phone.replace(/\D/g, "").slice(0, 10);
    const phoneChanged = cleanPhone !== originalPhone;
    const nameChanged = name.trim() !== originalName;

    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    if (cleanPhone.length !== 10) { toast.error("Enter a valid 10-digit phone number"); return; }

    if (!phoneChanged && !nameChanged) { toast("No changes to save"); return; }

    // If phone changed, show modal (SMS bypassed)
    if (phoneChanged) {
      setPendingPhone(cleanPhone);
      setOtpArray(["", "", "", "", "", ""]);
      setShowOtpModal(true);
      startResendTimer();
      return;
    }

    // Name-only change — save silently, no feedback
    fetch("/api/user", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }).then((res) => res.json()).then((data) => {
      if (data?.error) return;
      setOriginalName(name.trim());
      updateProfile({ userName: name.trim() });
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpArray];
    next[index] = digit;
    setOtpArray(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpArray[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = otpArray.join("");
    if (otp.length < 6) { toast.error("Enter the 6-digit OTP"); return; }

    setVerifying(true);
    try {
      // Save phone directly (OTP bypassed)
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: pendingPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update phone");

      setOriginalPhone(pendingPhone);
      setOriginalName(name.trim());
      login(pendingPhone, name.trim());
      toast.success("Profile updated successfully!");
      setShowOtpModal(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await sendPhoneOtp(pendingPhone);
      startResendTimer();
      setOtpArray(["", "", "", "", "", ""]);
      toast.success("OTP resent!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An error occurred");
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const firstName = (name || userName || "User").split(" ")[0];

  return (
    <div className="bg-[#E6F7F4] w-full px-[20px] py-[30px] lg:p-[60px] font-outfit shadow-sm h-full min-h-[400px]">
      <h1 className="txt-h1 leading-none lg:leading-[22px] tracking-[0.03em] font-medium text-[#121212]  mb-[30px] lg:mb-[45px]">
        {getGreeting()}! {firstName}!
      </h1>

      {loading ? (
        <div className="h-10 w-48 animate-pulse rounded bg-black/10" />
      ) : (
        <div className="max-w-[1062px] flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-[20px] lg:gap-[48px]">
            {/* Name */}
            <div className="flex flex-col gap-[15px] lg:gap-[20px] flex-1">
              <label className="font-outfit font-medium text-[#121212] txt-div-22 leading-[22px] tracking-[0.03em]  ">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="h-[40px] lg:h-[60px] w-full bg-transparent border border-[#000000]/30 px-[15px] py-[10px] lg:p-[20px] txt-div-20 leading-[20px] text-[#121212] placeholder:text-[#121212]/50 focus:border-[#045830] outline-none transition-colors"
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-[15px] lg:gap-[20px] flex-1">
              <label className="font-outfit font-medium text-[#121212] txt-div-22 leading-[22px] tracking-[0.03em]">
                Your Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="h-[40px] lg:h-[60px] w-full bg-transparent border border-[#000000]/30 px-[15px] py-[10px] lg:p-[20px] txt-div-20 leading-[20px] text-[#121212] placeholder:text-[#121212]/50 focus:border-[#045830] outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-[15px] mt-[20px]">
            <button
              onClick={handleSave}
              className="bg-[#045830] text-white font-semibold txt-div-22 btn-radius-15 w-[144px] lg:w-[182px] py-[14px] lg:py-[20px] hover:opacity-90 transition-opacity"
            >
              SAVE
            </button>
            <button
              onClick={() => { setName(originalName); setPhone(originalPhone); }}
              className="bg-black text-white font-semibold txt-div-22 btn-radius-15 w-[144px] lg:w-[182px] py-[14px] lg:py-[20px] hover:opacity-90 transition-opacity"
            >
              CANCEL
            </button>
          </div>

          {/* Mobile bottom nav */}
          <div className="mt-[33px] flex lg:hidden items-center gap-[20px] txt-h2 font-medium text-[#121212]">
            <Link href="/dashboard/orders" className="flex items-center gap-2 hover:opacity-70 transition-opacity underline underline-offset-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              All Order Page
            </Link>
            <span className="text-[#121212]/30 text-[24px]">|</span>
            <Link href="/dashboard/addresses" className="flex items-center gap-2 hover:opacity-70 transition-opacity underline underline-offset-4">
              Address Page
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !verifying && setShowOtpModal(false)}
          />
          <div className="relative z-10 w-full max-w-[480px] bg-white pt-[35px] pb-[25px] px-[30px] md:px-[45px] shadow-2xl">
            {/* Close */}
            <button
              onClick={() => !verifying && setShowOtpModal(false)}
              className="absolute right-[-15px] top-[-15px] md:right-[-20px] md:top-[-20px] shadow-[0_4px_10px_rgba(0,0,0,0.15)] bg-white rounded-full flex items-center justify-center w-[35px] h-[35px] md:w-[45px] md:h-[45px] hover:scale-105 transition-transform"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className="txt-h2 font-bold text-[#121212] mb-[5px] tracking-wide">
              Verify Updated Details
            </h2>
            <p className="text-[#767676] txt-p mb-[25px]">
              OTP Sent to {pendingPhone}{" "}
              <span
                className="text-[#FF4A4A] font-medium underline underline-offset-2 ml-1 cursor-pointer"
                onClick={() => !verifying && setShowOtpModal(false)}
              >
                Edit
              </span>
            </p>

            {/* 6-digit OTP boxes */}
            <div className="flex gap-[10px] mb-[15px]">
              {otpArray.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  placeholder="_"
                  autoComplete="off"
                  className="w-[44px] h-[52px] border border-[#d9d9d9] btn-radius-5 text-center text-[20px] font-bold text-[#121212] outline-none placeholder:text-[#121212]/30 focus:border-[#045830] transition-colors"
                />
              ))}
            </div>

            <p className="text-[#00B200] font-bold txt-p tracking-wide mb-[15px]">
              OTP sent via SMS and Whatsapp
            </p>

            <div className="flex items-center gap-[10px] txt-p mb-[30px]">
              <span className="text-[#767676]">Didn&apos;t Receive OTP?</span>
              <button
                onClick={handleResend}
                disabled={resendTimer > 0}
                className="text-[#121212] font-semibold hover:underline disabled:opacity-50 disabled:cursor-default"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer} seconds` : "Resend OTP"}
              </button>
            </div>

            <button
              onClick={handleVerify}
              disabled={verifying || otpArray.join("").length < 6}
              className="w-full h-[50px] bg-[#E5E5E5] text-[#767676] btn-16 font-bold tracking-wider btn-radius-5 transition-colors hover:bg-[#045830] hover:text-white disabled:hover:bg-[#E5E5E5] disabled:hover:text-[#767676] mb-[25px] uppercase"
            >
              {verifying ? "VERIFYING..." : "VERIFY NUMBER"}
            </button>

            <p className="txt-p text-[#767676] leading-relaxed">
              By signing in you agree to our{" "}
              <a href="/terms" className="underline hover:text-[#045830]">terms of service</a>
              {" "}and{" "}
              <a href="/privacy-policy" className="underline hover:text-[#045830]">privacy policy</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
