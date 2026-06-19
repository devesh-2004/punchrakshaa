"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

/**
 * SafeImage — a defensive drop-in replacement for next/image.
 *
 * Guarantees a product/UI image NEVER renders a broken-image icon, regardless of
 * the source value. It handles:
 *   - null / undefined / "" / whitespace-only src  -> renders the fallback
 *   - runtime load failures (404, blocked hotlink)  -> swaps to the fallback onError
 *   - arbitrary external hosts not in next.config    -> bypasses the optimizer
 *       (`unoptimized`) so next/image never throws "hostname not configured"
 *   - data: URLs (base64)                            -> served directly
 *   - local/root-relative paths ("/...")             -> optimized by next/image
 *
 * It is API-compatible with next/image (same props: fill, width/height, sizes,
 * priority, className, onClick, style, ...) so it can be dropped in directly.
 */

export const FALLBACK_IMAGE = "/images/placeholders/product-placeholder.svg";

type SafeImageProps = Omit<ImageProps, "src"> & {
  /** May be anything — null/undefined/empty/invalid are all handled. */
  src?: string | null;
  /** Override the fallback shown when src is missing or fails to load. */
  fallbackSrc?: string;
};

function isUsable(src: unknown): src is string {
  if (typeof src !== "string") return false;
  const v = src.trim();
  if (!v) return false;
  // Reject obviously-invalid values that can't resolve to an image.
  if (v === "null" || v === "undefined" || v === "#") return false;
  return true;
}

export default function SafeImage({
  src,
  fallbackSrc = FALLBACK_IMAGE,
  alt,
  onError,
  unoptimized,
  ...rest
}: SafeImageProps) {
  const resolve = (value?: string | null) => (isUsable(value) ? value.trim() : fallbackSrc);

  const [currentSrc, setCurrentSrc] = useState<string>(() => resolve(src));

  // Keep in sync when the incoming src changes (e.g. gallery navigation).
  useEffect(() => {
    setCurrentSrc(resolve(src));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fallbackSrc]);

  const isExternal = /^https?:\/\//i.test(currentSrc);
  const isData = currentSrc.startsWith("data:");
  const isFallback = currentSrc === fallbackSrc;

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt ?? ""}
      // Bypass the optimizer for arbitrary external/data URLs so unconfigured
      // hosts can never crash the render; local assets stay optimized.
      unoptimized={unoptimized ?? (isExternal || isData)}
      onError={(event) => {
        if (!isFallback) setCurrentSrc(fallbackSrc);
        onError?.(event);
      }}
    />
  );
}
