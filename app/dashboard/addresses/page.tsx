"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/auth/authStore";

type Address = {
  _id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};


const emptyForm = {
  fullName: "", phone: "", addressLine1: "", addressLine2: "",
  city: "", state: "", pincode: "", isDefault: false, addressType: "Home",
};

export default function DashboardAddresses() {
  const userName = useAuthStore((s) => s.userName);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  async function fetchAddresses() {
    try {
      const res = await fetch("/api/user/addresses");
      const data = await res.json();
      if (res.ok) setAddresses(data.addresses ?? []);
      else if (res.status !== 401) toast.error("Could not load addresses. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchAddresses().finally(() => { if (cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof typeof emptyForm, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Name required";
    if (!/^[6-9]\d{9}$/.test(form.phone)) errs.phone = "Valid 10-digit number required";
    if (form.addressLine1.trim().length < 10) errs.addressLine1 = "Address too short (min 10 chars)";
    if (!/^\d{6}$/.test(form.pincode)) errs.pincode = "Valid 6-digit pincode required";
    return errs;
  };

  const openAdd = () => {
    setForm({ ...emptyForm });
    setTouched({});
    setEditId(null);
    setModal("add");
  };

  const openEdit = (addr: Address) => {
    setForm({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 ?? "",
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: addr.isDefault,
      addressType: "Home",
    });
    setTouched({});
    setEditId(addr._id);
    setModal("edit");
  };

  const handleSave = async () => {
    const allTouched = Object.fromEntries(
      Object.keys(emptyForm).map((k) => [k, true]),
    );
    setTouched(allTouched);
    const errs = validate();
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const url = modal === "edit" ? `/api/user/addresses/${editId}` : "/api/user/addresses";
      const method = modal === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save address");
      setAddresses(data.addresses ?? []);
      toast.success(modal === "edit" ? "Address updated!" : "Address added!");
      setModal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/user/addresses/${id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update");
      setAddresses(data.addresses ?? []);
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

  const errs = Object.keys(touched).length > 0 ? validate() : {};

  if (modal) {
    return (
      <div className="bg-[#E6F7F4] w-full px-[20px] py-[30px] lg:px-[60px] lg:py-[45px] font-outfit shadow-sm h-full min-h-[400px]">
        <div className="max-w-[1100px]">

          {/* 2-col on desktop, single col on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[30px] gap-y-[20px]">

            {/* LEFT COLUMN
                Mobile order:  Name(1) → Phone(2) → Address(3) → Pincode(4) → AddressType(5)
                Desktop order: Name(1) → Pincode(2) → Phone(3)               [Address in right col]
            */}
            <div className="flex flex-col gap-[10px] lg:gap-[20px]">

              {/* Name — always first */}
              <Field label="Name" error={touched.fullName ? errs.fullName : undefined}>
                <input
                  type="text"
                  placeholder="enter your name here"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  onBlur={() => touch("fullName")}
                  className={inputCls(!!errs.fullName && !!touched.fullName)}
                />
              </Field>

              {/* Pincode — order 4 mobile, order 2 desktop */}
              <div className="order-4 lg:order-2">
                <Field label="Pincode" error={touched.pincode ? errs.pincode : undefined}>
                  <input
                    type="text"
                    placeholder="enter your area pincode here"
                    value={form.pincode}
                    onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onBlur={() => touch("pincode")}
                    className={inputCls(!!errs.pincode && !!touched.pincode)}
                  />
                </Field>
              </div>

              {/* Phone — order 2 mobile, order 3 desktop */}
              <div className="order-2 lg:order-3">
                <Field label="Phone Number" error={touched.phone ? errs.phone : undefined}>
                  <input
                    type="tel"
                    placeholder="enter your phone number here"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onBlur={() => touch("phone")}
                    className={inputCls(!!errs.phone && !!touched.phone)}
                  />
                </Field>
              </div>

              {/* Address — order 3 mobile only, hidden on desktop */}
              <div className="order-3 lg:hidden">
                <Field label="Address" error={touched.addressLine1 ? errs.addressLine1 : undefined}>
                  <textarea
                    rows={4}
                    placeholder="enter your complete address here"
                    value={form.addressLine1}
                    onChange={(e) => set("addressLine1", e.target.value)}
                    onBlur={() => touch("addressLine1")}
                    className={`${inputCls(!!errs.addressLine1 && !!touched.addressLine1)} !h-auto resize-none`}
                  />
                </Field>
              </div>

              {/* Address type — order 5 mobile only */}
              <div className="order-5 lg:hidden flex flex-col gap-[10px]">
                <label className="text-[#121212] font-medium text-[14px] leading-[22px] tracking-[0.03em]">Address type :</label>
                <div className="flex items-center gap-[20px]">
                  {["Home", "Office", "Other"].map((type) => (
                    <label key={type} className="flex items-center gap-[6px] cursor-pointer">
                      <input
                        type="radio"
                        name="addressType-mobile"
                        value={type}
                        checked={form.addressType === type}
                        onChange={() => set("addressType", type)}
                        className="w-[16px] h-[16px] accent-[#045830]"
                      />
                      <span className="text-[#121212] text-[14px]">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN — desktop only */}
            <div className="hidden lg:flex flex-col gap-[20px]">

              <Field label="Address" error={touched.addressLine1 ? errs.addressLine1 : undefined}>
                <textarea
                  rows={6}
                  placeholder="enter your complete address here"
                  value={form.addressLine1}
                  onChange={(e) => set("addressLine1", e.target.value)}
                  onBlur={() => touch("addressLine1")}
                  className={`${inputCls(!!errs.addressLine1 && !!touched.addressLine1)} !h-auto resize-none`}
                />
              </Field>

              {/* Address type — desktop */}
              <div className="flex flex-col gap-[10px]">
                <label className="text-[#121212] font-medium text-[20px] leading-[22px] tracking-[0.03em]">Address type :</label>
                <div className="flex items-center gap-[24px]">
                  {["Home", "Office", "Other"].map((type) => (
                    <label key={type} className="flex items-center gap-[8px] cursor-pointer">
                      <input
                        type="radio"
                        name="addressType-desktop"
                        value={type}
                        checked={form.addressType === type}
                        onChange={() => set("addressType", type)}
                        className="w-[16px] h-[16px] accent-[#045830]"
                      />
                      <span className="text-[#121212] text-[15px]">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Bottom row: stacked on mobile, single row on desktop */}
          <div className="mt-[30px] flex flex-col lg:flex-row lg:items-center gap-[20px]">

            <button
              type="button"
              onClick={() => set("isDefault", !form.isDefault)}
              className="flex items-center gap-[10px] w-max"
            >
              <div className={`w-[15px] h-[15px] lg:w-[20px] lg:h-[20px] border flex items-center justify-center transition-colors ${form.isDefault ? "bg-[#045830] border-[#045830]" : "border-[#121212]/40"}`}>
                {form.isDefault && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="text-[#121212] font-medium txt-p-lg">Make it as a default Address</span>
            </button>

            <div className="flex items-center gap-[15px]">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#045830] text-white font-semibold txt-div-22 btn-radius-15 w-[144px] lg:w-[182px] py-[14px] lg:py-[20px] hover:opacity-90 transition-opacity"
              >
                {saving ? "SAVING..." : "SAVE"}
              </button>
              <button
                onClick={() => setModal(null)}
                disabled={saving}
                className="bg-black text-white font-semibold txt-div-22 btn-radius-15 w-[144px] lg:w-[182px] py-[14px] lg:py-[20px] hover:opacity-90 transition-opacity"
              >
                CANCEL
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#E6F7F4] w-full p-[30px] lg:p-[60px] font-outfit shadow-sm h-full min-h-[400px] flex flex-col justify-between">
      <div>
        <h1 className="txt-h1 leading-none lg:leading-[22px] tracking-[0.03em] font-medium text-[#121212]  mb-[25px] lg:mb-[45px]">
          {getGreeting()}! {userName ? userName.split(" ")[0] : "User"}!
        </h1>

        <div className="max-w-[1100px] flex flex-col gap-[20px]">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-[90px] animate-pulse rounded bg-black/10" />
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-[#045830] rounded-[5px]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#045830" strokeWidth="1.5" className="mb-4 opacity-40"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <h2 className="font-outfit text-[18px] font-bold text-[#121212] mb-1">No Saved Addresses</h2>
              <p className="font-outfit text-[#767676] text-[14px]">Add an address to get started.</p>
            </div>
          ) : (
            addresses.map((addr) => (
              <div
                key={addr._id}
                className={`flex gap-[15px] lg:gap-[20px] border-[2px] p-[20px] md:p-[21px] bg-white ${addr.isDefault ? "border-[#045830]" : "border-black/15"}`}
              >
                {/* Radio indicator */}
                <button
                  onClick={() => !addr.isDefault && handleSetDefault(addr._id)}
                  className="lg:hidden mt-1 shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#045830]"
                >
                  {addr.isDefault && <div className="h-2.5 w-2.5 rounded-full bg-[#045830]" />}
                </button>

                {/* Main content */}
                <div className="flex-1 min-w-0 gap-[15px] md:gap-[22px] flex flex-col">
                  <div className="flex items-center gap-[10px] flex-wrap">
                    <p className="text-[#121212] font-outfit txt-div-20 leading-[20px] md:leading-[22px] tracking-[0.03em] font-light">Delivery to{" "}
                      <span className="text-[#121212] font-outfit txt-div-20 leading-[20px] md:leading-[22px] tracking-[0.03em] font-semibold block md:inline">
                        {addr.city || "—"} - {addr.pincode}
                      </span>
                    </p>
                    {addr.isDefault && (
                      <span className="hidden lg:inline-flex bg-[#045830] text-white text-[16px] font-bold tracking-wider px-[16px] py-[8px]">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-[#767676] text-[14px] lg:text-[18px] leading-[20px] lg:leading-[30px] tracking-[0.03em]">
                    {addr.addressLine1}
                    {addr.addressLine2 ? `, ${addr.addressLine2}` : ""},{" "}
                    {addr.city}, {addr.state}, {addr.pincode}
                  </p>
                </div>

                {/* Right column: DEFAULT badge top (mobile only), edit icon bottom on mobile / centered on desktop */}
                <div className="flex flex-col items-end justify-between lg:justify-center shrink-0 self-stretch">
                  {addr.isDefault ? (
                    <span className="lg:hidden bg-[#045830] text-white text-[12px] font-bold px-[18px] py-[8px]">
                      DEFAULT
                    </span>
                  ) : (
                    <span className="lg:hidden" />
                  )}
                  <button
                    onClick={() => openEdit(addr)}
                    className="hover:opacity-70 transition-opacity p-1"
                    aria-label="Edit address"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 lg:w-[30px] lg:h-[30px]">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}

          <button
            onClick={openAdd}
            className="mt-[10px] lg:mt-[25px] w-max mx-auto lg:mx-0 border border-[#045830] text-[#045830] font-semibold text-[12px] lg:text-[16px] tracking-[0.10em] uppercase rounded-[10px] md:rounded-[15px] px-[15px] py-[10px] md:px-[20px] md:py-[15px] hover:bg-[#045830] hover:text-white transition-colors"
          >
            ADD NEW ADDRESS
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
          <div className="mt-[33px] flex lg:hidden items-center gap-[20px] txt-h2 font-medium text-[#121212]">
            <Link href="/dashboard/orders" className="flex items-center gap-2 hover:opacity-70 transition-opacity underline underline-offset-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              All Order Page
            </Link>
            <span className="text-[#121212]/30 text-[24px]">|</span>
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-70 transition-opacity underline underline-offset-4">
              Profile Page
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex justify-between items-center">
        <label className="font-outfit font-medium text-[#121212] txt-div-22 leading-[22px] tracking-[0.03em] ">{label}</label>
        {error && <span className="text-red-500 text-[12px]">{error}</span>}
      </div>
      {children}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `h-[40px] lg:h-[60px] w-full bg-transparent border border-[#000000]/30 px-[15px] py-[10px] lg:p-[15px] txt-div-20 leading-[20px] text-[#121212] placeholder:text-[#121212]/50 focus:border-[#045830] outline-none transition-colors ${hasError ? "border-red-400" : "border-[#121212]/20"} `;
}
