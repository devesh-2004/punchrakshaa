"use client";

import Link from "next/link";
import * as React from "react";

type Variant = "primary" | "outlineWhite" | "ghost";

export function ButtonSecondary({
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

    const cls = `md:rounded-[10px] md:mt-[18px] bg-white px-8 md:py-[15px] md:px-[20px] font-semibold text-[#045930] hover:bg-gray-100 transition shadow-sm leading-snug font-outfit txt-p tracking-[0.1em] ${className} btn-glare`;

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

