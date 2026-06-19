"use client";
import { useEffect, useState } from "react";

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

export default function InlineImage({ src, alt = "", className = "" }: Props) {
  const [inlineSvg, setInlineSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    setInlineSvg(null);

    const makeResponsive = (text: string) =>
      text.replace(/<svg([^>]*)>/, (_m, attrs: string) =>
        `<svg${attrs
          .replace(/\bwidth="[^"]*"/, 'width="100%"')
          .replace(/\bheight="[^"]*"/, 'height="100%"')}>`
      );

    // SVG data URL — decode and inline directly, no fetch needed
    if (src.startsWith("data:image/svg+xml")) {
      try {
        const raw = src.includes(";base64,")
          ? decodeURIComponent(escape(atob(src.split(";base64,")[1])))
          : decodeURIComponent(src.split(",")[1]);
        if (raw.includes("<svg")) setInlineSvg(makeResponsive(raw));
      } catch {/* fall through to <img> */}
      return;
    }

    // Remote URL — try fetch + inline (works when CORS allows it)
    fetch(src)
      .then((r) => r.text())
      .then((text) => {
        if (!text.includes("<svg")) return;
        setInlineSvg(makeResponsive(text));
      })
      .catch(() => {/* fall through to <img> fallback */});
  }, [src]);

  if (inlineSvg) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: inlineSvg }}
      />
    );
  }

  // Don't render an empty <img> (shows a broken icon in some browsers).
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src.endsWith("/images/placeholders/product-placeholder.svg")) return;
        img.src = "/images/placeholders/product-placeholder.svg";
      }}
    />
  );
}
