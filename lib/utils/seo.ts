export function absoluteUrl(pathname: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.punchraksha.com";
  return new URL(pathname, base).toString();
}

