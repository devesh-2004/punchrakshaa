export function absoluteUrl(pathname: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(pathname, base).toString();
}

