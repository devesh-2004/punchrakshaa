"use client";

import Link from "next/link";
import * as React from "react";
type Variant = "primary" | "outlineWhite" | "ghost" | "outlinePrimary";
export function Button({
  children,
  className = "",
  href,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center select-none rounded-[15px] px-6 font-outfit font-semibold uppercase transition";
  const styles: Record<Variant, string> = {
    primary: "bg-primary text-white border border-primary hover:opacity-95 active:opacity-90",
    outlineWhite:
      "bg-white text-[#014223] border border-white hover:bg-white/95 active:bg-white/90",
    ghost: "bg-transparent text-text-main border border-transparent hover:bg-black/5",
    outlinePrimary: "bg-transparent text-primary border-[1.5px] border-primary hover:bg-primary hover:text-white",
  };

  const cls = `${base} ${styles[variant]} ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

