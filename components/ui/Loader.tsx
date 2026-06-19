"use client";

import React from "react";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  light?: boolean;
}

export function Loader({ size = "md", className = "", light = false }: LoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 md:w-8 md:h-8 border-2 md:border-[3px]",
    lg: "w-10 h-10 md:w-12 md:h-12 border-[3px]",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full animate-spin border-[#045830] border-t-transparent border-solid`}
      />
      <style jsx>{`
        .animate-spin {
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
      <Loader size="lg" />
    </div>
  );
}
