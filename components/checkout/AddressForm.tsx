"use client";

import { useState } from "react";

export type AddressValue = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
};

const states = [
  "Andhra Pradesh",
  "Delhi",
  "Gujarat",
  "Karnataka",
  "Maharashtra",
  "Rajasthan",
  "Tamil Nadu",
  "Uttar Pradesh",
  "West Bengal",
];

export function AddressForm({
  value,
  onChange,
}: {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
}) {
  const [touched, setTouched] = useState(false);
  const set = (k: keyof AddressValue, v: string) => onChange({ ...value, [k]: v });

  const invalid =
    !value.fullName ||
    !/^[6-9]\d{9}$/.test(value.phone) ||
    !value.addressLine1 ||
    !value.city ||
    !value.state ||
    !/^\d{6}$/.test(value.pincode);

  return (
    <div className="rounded-[13px] border border-black/15 bg-white p-6">
      <p className="font-outfit text-[25px] font-semibold text-text-main">Delivery Address</p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Full Name">
          <input
            value={value.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className="h-[52px] w-full rounded-[10px] border border-black/20 px-4 outline-none"
          />
        </Field>
        <Field label="Phone">
          <div className="relative flex items-center">
            <span className="absolute left-4 font-outfit text-[14px] font-medium border-r border-black/10 pr-3">
              +91
            </span>
            <input
              value={value.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="h-[52px] w-full rounded-[10px] border border-black/20 pl-[55px] pr-4 outline-none font-outfit"
              placeholder="10-digit mobile number"
            />
          </div>
        </Field>
        <Field label="Address Line 1" className="md:col-span-2">
          <input
            value={value.addressLine1}
            onChange={(e) => set("addressLine1", e.target.value)}
            className="h-[52px] w-full rounded-[10px] border border-black/20 px-4 outline-none"
          />
        </Field>
        <Field label="Address Line 2 (optional)" className="md:col-span-2">
          <input
            value={value.addressLine2 ?? ""}
            onChange={(e) => set("addressLine2", e.target.value)}
            className="h-[52px] w-full rounded-[10px] border border-black/20 px-4 outline-none"
          />
        </Field>
        <Field label="City">
          <input
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            className="h-[52px] w-full rounded-[10px] border border-black/20 px-4 outline-none"
          />
        </Field>
        <Field label="State">
          <select
            value={value.state}
            onChange={(e) => set("state", e.target.value)}
            className="h-[52px] w-full rounded-[10px] border border-black/20 px-4 outline-none"
          >
            <option value="">Select</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pincode">
          <input
            value={value.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-[52px] w-full rounded-[10px] border border-black/20 px-4 outline-none"
          />
        </Field>
      </div>

      <button
        className="mt-6 h-[68px] w-full rounded-[15px] bg-primary font-outfit text-[22px] font-semibold uppercase tracking-[2.2px] text-white"
        onClick={() => setTouched(true)}
        type="button"
      >
        Save Address
      </button>

      {touched && invalid && (
        <div className="mt-3 flex flex-col gap-1">
          {!value.fullName && <p className="text-[14px] text-red-600">Full Name is required.</p>}
          {value.phone && !/^[6-9]\d{9}$/.test(value.phone) && <p className="text-[14px] text-red-600">Enter a valid 10-digit Indian mobile number.</p>}
          {!value.phone && <p className="text-[14px] text-red-600">Phone number is required.</p>}
          {!value.addressLine1 && <p className="text-[14px] text-red-600">Address is required.</p>}
          {!value.city && <p className="text-[14px] text-red-600">City is required.</p>}
          {!value.state && <p className="text-[14px] text-red-600">State is required.</p>}
          {value.pincode && !/^\d{6}$/.test(value.pincode) && <p className="text-[14px] text-red-600">Enter a valid 6-digit Indian pincode.</p>}
          {!value.pincode && <p className="text-[14px] text-red-600">Pincode is required.</p>}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block font-outfit text-[16px] font-semibold text-text-main">{label}</span>
      {children}
    </label>
  );
}

