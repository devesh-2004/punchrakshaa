"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

declare global {
  interface Window {
    recaptchaVerifierLogin: any;
    grecaptcha: any;
  }
}

type Step = "enter" | "confirm" | "otp";

const IS_DEV = process.env.NEXT_PUBLIC_NODE_ENV === "development";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("enter");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpMessage, setOtpMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifierLogin) {
        window.recaptchaVerifierLogin.clear();
        window.recaptchaVerifierLogin = null;
      }
    };
  }, []);

  const canSend = useMemo(() => phone.length === 10 && cooldown === 0 && !loading, [phone, cooldown, loading]);

  async function sendOtp() {
    if (!canSend) return;
    setLoading(true);
    setOtpMessage(null);
    try {
      if (!window.recaptchaVerifierLogin) {
        window.recaptchaVerifierLogin = new RecaptchaVerifier(firebaseAuth, "recaptcha-container-login", {
          size: "invisible",
        });
      }
      const mobile = `+91${phone}`;
      const confirm = await signInWithPhoneNumber(firebaseAuth, mobile, window.recaptchaVerifierLogin);
      setConfirmationResult(confirm);
      if (step === "otp") {
        setOtpMessage({ type: "success", text: "OTP resent successfully" });
        setTimeout(() => {
          setOtpMessage((prev) => (prev?.type === "success" ? null : prev));
        }, 4000);
      }
      setStep("otp");
      setCooldown(30);
      toast.success("OTP sent to your mobile number");
    } catch (e) {
      console.error(e);
      if (window.recaptchaVerifierLogin) {
        window.recaptchaVerifierLogin.render().then((widgetId: any) => {
          window.grecaptcha.reset(widgetId);
        });
      }
      const rawMsg = e instanceof Error ? e.message : "Failed to send OTP";
      const cleanMsg = rawMsg.replace(/Firebase:?\s*/i, "").replace(/\s*\(auth\/.*?\)/i, "").trim();
      toast.error(cleanMsg || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function devLogin() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Dev login failed");
      toast.success("Logged in (dev)");
      router.push("/account");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dev login failed");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      if (!confirmationResult) throw new Error("Please request OTP first");
      
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();

      const res = await fetch("/api/auth/firebase-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "OTP verification failed");
      
      toast.success("Logged in");
      router.push("/account");
    } catch (e) {
      console.error(e);
      toast.error((e instanceof Error ? e.message : "OTP verification failed"));
      setOtpMessage({ type: "error", text: "Enter a valid OTP" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-[1920px] px-4 py-[60px] sm:px-6 sm:py-[80px] lg:px-4 lg:px-[50px]">
        <h1 className="font-outfit text-[45px] font-semibold tracking-[1.35px] text-text-main">Login</h1>

        <div className="mt-10 max-w-[640px] rounded-[13px] border border-black/15 bg-white p-6">
          {step === "enter" ? (
            <>
              <p className="font-outfit text-[20px] text-text-muted">Enter Your Number</p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="mt-4 h-[68px] w-full rounded-[10px] border border-black/20 px-5 text-[20px] outline-none"
              />
              <button
                className="mt-6 h-[68px] w-full rounded-[15px] bg-primary font-outfit text-[22px] font-semibold uppercase tracking-[2.2px] text-white disabled:opacity-50"
                disabled={phone.length !== 10}
                onClick={() => setStep("confirm")}
              >
                Continue
              </button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <p className="font-outfit text-[20px] text-text-muted">Login - Number Enter</p>
              <p className="mt-4 font-outfit text-[25px] font-semibold text-text-main">+91 {phone}</p>
              <div className="mt-6 flex gap-4">
                <button
                  className="h-[68px] flex-1 rounded-[15px] border border-black/20 bg-white font-outfit text-[18px] font-semibold"
                  onClick={() => setStep("enter")}
                >
                  Edit
                </button>
                <button
                  className="h-[68px] flex-1 rounded-[15px] bg-primary font-outfit text-[18px] font-semibold uppercase tracking-[2.2px] text-white disabled:opacity-50"
                  disabled={!canSend}
                  onClick={sendOtp}
                >
                  Send OTP
                </button>
              </div>
              {IS_DEV && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-black/10" />
                    <span className="font-outfit text-[11px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 rounded px-2 py-0.5 uppercase tracking-wider">Dev Only</span>
                    <div className="flex-1 h-px bg-black/10" />
                  </div>
                  <button
                    disabled={loading}
                    onClick={devLogin}
                    className="h-[68px] w-full rounded-[15px] border-2 border-dashed border-orange-400 bg-orange-50 font-outfit text-[18px] font-bold text-orange-600 uppercase tracking-wider disabled:opacity-50"
                  >
                    {loading ? "Logging in..." : "⚡ Skip OTP (Dev Login)"}
                  </button>
                </div>
              )}
            </>
          ) : null}

          {step === "otp" ? (
            <>
              <p className="font-outfit text-[20px] text-text-muted">Verify OTP</p>
              <p className="mt-2 text-[16px] text-text-muted">Sent to +91 {phone}</p>
              <input
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (otpMessage?.type === "error") setOtpMessage(null);
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
                  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onKeyUp={(e) => {
                  const target = e.target as HTMLInputElement;
                  setTimeout(() => target.setSelectionRange(target.value.length, target.value.length), 0);
                }}
                placeholder="Enter 6-digit OTP"
                className="mt-4 mb-2 h-[68px] w-full rounded-[10px] border border-black/20 px-5 text-[22px] tracking-[6px] outline-none"
              />

              {/* Message Container: preserves height to avoid layout shift */}
              <div className="h-6 w-full flex items-start mb-2">
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

              {devOtp ? (
                <p className="mt-1 mb-2 text-[14px] text-text-muted">
                  Dev OTP: <span className="font-semibold text-text-main">{devOtp}</span>
                </p>
              ) : null}
              <button
                className="mt-2 h-[68px] w-full rounded-[15px] bg-primary font-outfit text-[22px] font-semibold uppercase tracking-[2.2px] text-white disabled:opacity-50"
                disabled={otp.length !== 6 || loading}
                onClick={verifyOtp}
              >
                Verify & Login
              </button>
              <button
                className="mt-4 w-full text-[16px] text-text-muted underline disabled:opacity-50"
                disabled={cooldown !== 0 || loading}
                onClick={sendOtp}
              >
                Resend OTP {cooldown ? `(${cooldown}s)` : ""}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div id="recaptcha-container-login"></div>
    </div>
  );
}

