"use client";

import { useMemo } from "react";
import { ButtonBase } from "@/components/ui/ButtonBase";

export type Address = {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  type: string;
};

interface AddressListProps {
  addresses: Address[];
  selectedAddressId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onAddNew: () => void;
}

export function AddressList({
  addresses,
  selectedAddressId,
  onSelect,
  onEdit,
  onAddNew,
}: AddressListProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink min-h-0 flex flex-col gap-[30px] py-6 px-[15px] md:px-[30px] overflow-y-auto no-scrollbar">
        <div className="font-outfit txt-p-lg font-semibold text-[#121212] uppercase !text-[16px] md:!text-[22px]">
          ADD ADDRESS
        </div>

        <div className="flex flex-col gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              onClick={() => onSelect(addr.id)}
              className={`cursor-pointer rounded-[5px] border p-4 transition-all ${
                selectedAddressId === addr.id
                  ? "border-primary bg-primary-bg/20"
                  : "border-black/10 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selectedAddressId === addr.id
                      ? "border-primary bg-white"
                      : "border-black/20 bg-white"
                  }`}
                >
                  {selectedAddressId === addr.id && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="font-outfit txt-p-lg font-normal text-[#121212] truncate">
                      Delivery to{" "}
                      <span className="font-medium">
                        {addr.city} - {addr.pincode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(addr.id);
                        }}
                        className="font-outfit txt-p font-medium underline hover:text-primary transition-colors"
                      >
                        EDIT
                      </button>
                      {addr.isDefault && (
                        <span className="rounded-[2px] bg-primary px-2 py-0.5 font-outfit text-[12px] md:txt-p font-bold tracking-wider text-white">
                          DEFAULT
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-outfit txt-p leading-relaxed text-text-muted line-clamp-3">
                    {addr.addressLine1},{" "}
                    {addr.addressLine2 ? `${addr.addressLine2}, ` : ""}
                    {addr.city}, {addr.state}, {addr.pincode}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-[15px] md:px-[30px] pb-6 flex flex-col gap-4">
        <div className="h-[1px] w-full bg-black/60" />
        <div className="flex items-center justify-center">
          <ButtonBase
            onClick={onAddNew}
            className="!block !flex-none !shrink-0 bg-white !text-primary border-primary !border-[1px] !rounded-[10px] !font-medium !px-[20px] !py-[15px] text-center"
          >
            ADD NEW ADDRESS
          </ButtonBase>
        </div>
      </div>
    </div>
  );
}
