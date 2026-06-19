import type { ReactNode } from "react";

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[36px] items-center justify-center rounded-[10px] bg-primary px-4 font-outfit text-[16px] font-semibold tracking-[0.48px] text-white ${className}`}
    >
      {children}
    </span>
  );
}

