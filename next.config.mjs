// Allow the configured Cloudflare R2 public host (custom domain or *.r2.dev) for next/image.
const r2Host = (() => {
  try {
    return process.env.R2_PUBLIC_BASE_URL ? new URL(process.env.R2_PUBLIC_BASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      // Cloudflare R2 (public dev URL + S3 endpoint)
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      // YouTube video thumbnails (testimonial videos)
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      ...(r2Host ? [{ protocol: "https", hostname: r2Host }] : []),
    ],
  },
};

export default nextConfig;

