"use client";

import { useState, forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { z } from "zod";

export type NewAddress = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  type: "Home" | "Office" | "Other";
};

interface AddAddressFormProps {
  initialValue?: Partial<NewAddress>;
  isEdit?: boolean;
  onSave: (val: NewAddress) => void;
  isProcessing?: boolean;
}

export interface AddAddressFormHandle {
  submit: () => void;
}

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

export const AddAddressForm = forwardRef<
  AddAddressFormHandle,
  AddAddressFormProps
>(({ initialValue, isEdit, onSave, isProcessing = false }, ref) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const pincodeRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleFocus = (elementRef: React.RefObject<HTMLElement>) => {
    const scrollToEl = () => {
      if (!scrollContainerRef.current || !elementRef.current) return;
      const container = scrollContainerRef.current;
      const el = elementRef.current;
      // Absolute position within scroll content — unaffected by keyboard opening
      const absTop =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      container.scrollTo({ top: Math.max(0, absTop - 24), behavior: "smooth" });
    };
    // Immediate: handles field-to-field when keyboard is already open
    scrollToEl();
    // Delayed: handles first focus when keyboard is still animating open
    setTimeout(scrollToEl, 400);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextRef?: React.RefObject<HTMLElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      } else {
        (e.target as HTMLElement).blur();
      }
    }
  };

  const [form, setForm] = useState<NewAddress>({
    fullName: initialValue?.fullName ?? "",
    phone: initialValue?.phone ?? "",
    address: initialValue?.address ?? "",
    city: initialValue?.city ?? "",
    state: initialValue?.state ?? "",
    pincode: initialValue?.pincode ?? "",
    type: initialValue?.type ?? "Home",
  });


  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  const set = (k: keyof NewAddress, v: any) => setForm({ ...form, [k]: v });

  const addressSchema = z.object({
    fullName: z.string().min(1, "Name is required"),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Valid mobile required"),
    address: z.string().min(40, "Address must be at least 40 characters"),
    pincode: z.string().regex(/^\d{6}$/, "Valid pincode required"),
    type: z.enum(["Home", "Office", "Other"]),
  });

  const validation = addressSchema.safeParse(form);
  const errors = validation.success
    ? {}
    : validation.error.flatten().fieldErrors;
  const invalid = !validation.success;

  const handleSubmit = () => {
    // Mark all fields touched so any remaining errors show
    setTouched({ fullName: true, phone: true, address: true, pincode: true });
    if (!invalid) {
      onSave(form);
    }
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }));

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div ref={scrollContainerRef} className="flex-1 flex flex-col gap-[15px] py-6 px-[15px] md:px-[30px] overflow-y-auto custom-scrollbar">
        <div className="font-outfit txt-p-lg font-semibold text-[#121212] uppercase !text-[16px] md:!text-[22px]">
          ADD NEW ADDRESS
        </div>

        <div className="flex flex-col gap-[15px]">
          <label className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="font-outfit txt-p-lg font-medium text-[#121212]">
                Name
              </span>
              {touched.fullName && errors.fullName && (
                <span className="txt-p text-red-600 font-outfit text-[12px]">
                  {errors.fullName[0]}
                </span>
              )}
            </div>
            <input
              ref={nameRef}
              type="text"
              placeholder="enter your name here"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              onBlur={() => touch("fullName")}
              onFocus={() => handleFocus(nameRef)}
              onKeyDown={(e) => handleKeyDown(e, phoneRef)}
              enterKeyHint="next"
              className="w-full border border-[#D9D9D9] bg-white py-[10px] px-[15px] font-outfit txt-p text-[#121212] placeholder:text-[#8a8a8a] outline-none focus:border-[#045830] transition-colors"
            />
          </label>

          <label className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="font-outfit txt-p-lg font-medium text-[#121212]">
                Phone Number
              </span>
              {touched.phone && errors.phone && (
                <span className="txt-p text-red-600 font-outfit text-[12px]">
                  {errors.phone[0]}
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-4 font-outfit txt-p text-[#121212] font-medium border-r border-[#D9D9D9] pr-3">
                +91
              </span>
              <input
                ref={phoneRef}
                type="tel"
                placeholder="enter your phone number here"
                value={form.phone}
                onChange={(e) =>
                  set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                onBlur={() => touch("phone")}
                onFocus={() => handleFocus(phoneRef)}
                onKeyDown={(e) => handleKeyDown(e, addressRef)}
                enterKeyHint="next"
                className="w-full border border-[#D9D9D9] bg-white py-[10px] px-[15px] pl-[65px] font-outfit txt-p text-[#121212] placeholder:text-[#8a8a8a] outline-none focus:border-[#045830] transition-colors"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="font-outfit txt-p-lg font-medium text-[#121212]">
                Address
              </span>
              {touched.address && errors.address && (
                <span className="txt-p text-red-600 font-outfit text-[12px]">
                  {errors.address[0]}
                </span>
              )}
            </div>
            <textarea
              ref={addressRef}
              rows={4}
              placeholder="enter your complete address here"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              onBlur={() => touch("address")}
              onFocus={() => handleFocus(addressRef)}
              onKeyDown={(e) => handleKeyDown(e, pincodeRef)}
              {...{ enterKeyHint: "next" }}
              className="w-full border border-[#D9D9D9] bg-white py-[10px] px-[15px] font-outfit txt-p text-[#121212] placeholder:text-[#8a8a8a] outline-none focus:border-[#045830] transition-colors resize-none h-[90px] address-input"
            />
          </label>

          <label className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="font-outfit txt-p-lg font-medium text-[#121212]">
                Pincode
              </span>
              {touched.pincode && errors.pincode && (
                <span className="txt-p text-red-600 font-outfit text-[12px]">
                  {errors.pincode[0]}
                </span>
              )}
            </div>
            <input
              ref={pincodeRef}
              type="text"
              placeholder="enter your area pincode here"
              value={form.pincode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                set("pincode", val);
                if (val.length === 6) {
                  touch("pincode");
                  pincodeRef.current?.blur();
                }
              }}
              onBlur={() => touch("pincode")}
              onFocus={() => handleFocus(pincodeRef)}
              onKeyDown={(e) => handleKeyDown(e)}
              enterKeyHint="done"
              className="w-full border border-[#D9D9D9] bg-white py-[10px] px-[15px] font-outfit txt-p text-[#121212] placeholder:text-[#8a8a8a] outline-none focus:border-[#045830] transition-colors"
            />
          </label>

          {/* <div className="flex flex-col gap-4 pt-2">
            <span className="font-outfit txt-p-lg font-medium text-[#121212]">
              Address type :
            </span>
            <div className="flex items-center gap-6">
              {(["Home", "Office", "Other"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("type", type)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${form.type === type ? "border-[#045830]" : "border-[#D9D9D9]"}`}
                  >
                    {form.type === type && (
                      <div className="h-[12px] w-[12px] rounded-full bg-[#045830]" />
                    )}
                  </div>
                  <span className="font-outfit txt-p font-medium text-[#121212]">
                    {type}
                  </span>
                </button>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
});
AddAddressForm.displayName = "AddAddressForm";
